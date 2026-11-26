// npm run check:rls: proves the public roles (anon, authenticated) can read and write nothing.
//
// It connects with SUPABASE_DB_URL (the same connection db:push uses) and needs no API key, so key
// rotation never breaks it. Two kinds of check:
//
// Every table and function in the public schema is discovered from the catalogue, so anything a later
// migration adds is checked automatically (nothing to keep in sync by hand).
//
// 1. Catalogue: every table has row-level security on and no policies; the public roles hold no
//    table privileges and cannot execute any function.
// 2. Behaviour: inside ONE transaction, switch to each public role and actually try a read of every
//    table, a write, a delete and a call of every function (with NULL arguments; the permission check
//    comes before the function body). Each attempt must fail with 42501 (permission denied). The transaction is
//    always rolled back at the end, so even a leak would write nothing, which is why reset_demo can be
//    tried safely here.
//
// The database password never appears in the output.
import './env'
import postgres from 'postgres'
import { assertDemoProject, dbUrlMatchesProject, normalizeDbUrl } from '../lib/demoProject'
import { requireEnv } from './env'

const PUBLIC_ROLES = ['anon', 'authenticated'] as const
const PERMISSION_DENIED = '42501'


class Rollback extends Error {}

type Result = 'blocked' | 'leak' | 'inconclusive'

async function main() {
  let ref: string
  try {
    ref = assertDemoProject()
  } catch (e) {
    console.error((e as Error).message)
    process.exitCode = 1
    return
  }
  const normalized = normalizeDbUrl(requireEnv('SUPABASE_DB_URL'))
  if (!normalized || !dbUrlMatchesProject(normalized.url, ref)) {
    console.error(`Refusing to run: SUPABASE_DB_URL is not a valid connection string for the demo project "${ref}".`)
    process.exitCode = 1
    return
  }

  const sql = postgres(normalized.url, { max: 1, prepare: false, ssl: 'require', onnotice: () => {} })
  const results: Result[] = []
  const report = (label: string, result: Result, note: string) => {
    results.push(result)
    console.log(`${label.padEnd(48)} ${note}`)
  }

  try {
    // Discover every table and every non-extension function in the public schema.
    const TABLES = (
      await sql<{ relname: string }[]>`
        select c.relname from pg_class c join pg_namespace n on n.oid = c.relnamespace
        where n.nspname = 'public' and c.relkind in ('r', 'p') order by c.relname`
    ).map((r) => r.relname)
    const FUNCTIONS = await sql<{ oid: number; proname: string; args: string[] }[]>`
      select p.oid::int as oid, p.proname,
             coalesce(array(select format_type(t, null) from unnest(p.proargtypes) as t), '{}') as args
      from pg_proc p join pg_namespace n on n.oid = p.pronamespace
      where n.nspname = 'public' and p.prokind = 'f'
        and not exists (select 1 from pg_depend d where d.objid = p.oid and d.deptype = 'e')
      order by p.proname`
    console.log(`Found ${TABLES.length} tables and ${FUNCTIONS.length} functions in the public schema.
`)
    if (TABLES.length === 0) report('tables', 'inconclusive', 'INCONCLUSIVE (no tables found)')

    // 1. Catalogue checks (as the connecting owner role).
    const rls = await sql<{ relname: string; rls: boolean; forced: boolean }[]>`
      select c.relname, c.relrowsecurity as rls, c.relforcerowsecurity as forced
      from pg_class c join pg_namespace n on n.oid = c.relnamespace
      where n.nspname = 'public' and c.relname = any(${TABLES})`
    for (const t of TABLES) {
      const row = rls.find((r) => r.relname === t)
      if (!row) report(`rls   ${t}`, 'inconclusive', 'INCONCLUSIVE (table not found)')
      else report(`rls   ${t}`, row.rls && row.forced ? 'blocked' : 'leak', row.rls && row.forced ? 'on (forced)' : 'LEAK: row-level security off')
    }

    const policies = await sql<{ n: number }[]>`
      select count(*)::int as n from pg_policies where schemaname = 'public' and tablename = any(${TABLES})`
    report('policies on demo tables', policies[0].n === 0 ? 'blocked' : 'leak', policies[0].n === 0 ? 'none' : `LEAK: ${policies[0].n} policies`)

    const grants = await sql<{ grantee: string; table_name: string; privilege_type: string }[]>`
      select grantee, table_name, privilege_type from information_schema.role_table_grants
      where table_schema = 'public' and table_name = any(${TABLES}) and grantee = any(${[...PUBLIC_ROLES, 'PUBLIC']})`
    report('table grants to public roles', grants.length === 0 ? 'blocked' : 'leak',
      grants.length === 0 ? 'none' : `LEAK: ${grants.map((g) => `${g.grantee}:${g.privilege_type} ${g.table_name}`).join(', ')}`)

    for (const f of FUNCTIONS) {
      const [priv] = await sql<{ anon: boolean; auth: boolean }[]>`
        select has_function_privilege('anon', ${f.oid}::oid, 'execute') as anon,
               has_function_privilege('authenticated', ${f.oid}::oid, 'execute') as auth`
      const ok = !priv.anon && !priv.auth
      report(`exec  ${f.proname}`, ok ? 'blocked' : 'leak', ok ? 'no public execute' : 'LEAK: public roles can execute')
    }

    // 2. Behaviour checks, inside one transaction that is always rolled back.
    try {
      await sql.begin(async (tx) => {
        for (const role of PUBLIC_ROLES) {
          await tx.unsafe(`set local role ${role}`)
          const attempt = async (label: string, statement: string) => {
            try {
              await tx.savepoint(async (sp) => {
                await sp.unsafe(statement)
              })
              report(`${role.padEnd(13)} ${label}`, 'leak', 'LEAK: allowed')
            } catch (e) {
              const code = (e as { code?: string }).code
              if (code === PERMISSION_DENIED) report(`${role.padEnd(13)} ${label}`, 'blocked', `blocked (${PERMISSION_DENIED})`)
              else report(`${role.padEnd(13)} ${label}`, 'inconclusive', `INCONCLUSIVE (${code ?? 'no code'})`)
            }
          }
          for (const t of TABLES) await attempt(`read ${t}`, `select * from public.${t} limit 1`)
          await attempt('write feedback', `insert into public.feedback (sku_id, rating, taste_note) values ('dark-92', 5, 'rls-check')`)
          await attempt('delete scan_events', `delete from public.scan_events`)
          for (const f of FUNCTIONS) {
            const args = f.args.map((t) => `null::${t}`).join(', ')
            await attempt(`call ${f.proname}`, `select public.${f.proname}(${args})`)
          }
          await tx.unsafe('reset role')
        }
        throw new Rollback('always roll back')
      })
    } catch (e) {
      if (!(e instanceof Rollback)) throw e
    }
  } catch (e) {
    const msg = (e instanceof Error ? e.message : String(e)).split(normalized.password).join('****')
    console.error(`Could not run the check: ${msg}`)
    process.exitCode = 1
    return
  } finally {
    await sql.end({ timeout: 5 })
  }

  const leaks = results.filter((r) => r === 'leak').length
  const unclear = results.filter((r) => r === 'inconclusive').length
  if (leaks || unclear) {
    console.error(`\n${leaks} leak(s), ${unclear} inconclusive check(s). Every check must pass.`)
    process.exitCode = 1
    return
  }
  console.log(`\nOK: all ${results.length} checks passed. The public roles can read and write nothing (all attempts rolled back).`)
}

main()
