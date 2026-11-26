-- Product agent (ADR 0006): one counting function per data question.
-- Counting happens here, so answers are exact however many rows exist (no 1,000-row API limit).
-- Every function returns the same shape, ordered by total descending, then key:
--   key, label, total, live, synthetic, first_ts, last_ts
-- first_ts and last_ts are the earliest and latest row used across the whole result.

create or replace function public.agent_scans_by_code(p_market text)
returns table (key text, label text, total bigint, live bigint, synthetic bigint, first_ts timestamptz, last_ts timestamptz)
language sql
stable
security invoker
set search_path = ''
as $$
  with s as (
    select e.code_id, e.source, e.ts
    from public.scan_events e
    where e.market = p_market and e.is_bot = false
  ),
  g as (
    select s.code_id as k,
           count(*) as total,
           count(*) filter (where s.source = 'live') as live,
           count(*) filter (where s.source = 'synthetic') as synthetic
    from s
    group by s.code_id
  ),
  r as (select min(s.ts) as first_ts, max(s.ts) as last_ts from s)
  select g.k,
         coalesce(sk.name, col.name, g.k) || ' ' || replace(cp.channel, '_', ' '),
         g.total, g.live, g.synthetic, r.first_ts, r.last_ts
  from g
  join public.codes c on c.id = g.k
  join public.campaigns cp on cp.id = c.campaign_id
  left join public.skus sk on sk.id = c.sku_id
  left join public.collections col on col.id = c.collection_id
  cross join r
  order by g.total desc, g.k asc;
$$;

create or replace function public.agent_feedback_visits_by_campaign()
returns table (key text, label text, total bigint, live bigint, synthetic bigint, first_ts timestamptz, last_ts timestamptz)
language sql
stable
security invoker
set search_path = ''
as $$
  with v as (
    select coalesce(p.campaign_id, 'none') as k, p.source, p.ts
    from public.page_views p
    where p.page = 'feedback'
  ),
  g as (
    select v.k,
           count(*) as total,
           count(*) filter (where v.source = 'live') as live,
           count(*) filter (where v.source = 'synthetic') as synthetic
    from v
    group by v.k
  ),
  r as (select min(v.ts) as first_ts, max(v.ts) as last_ts from v)
  select g.k, coalesce(cp.name, 'No campaign'), g.total, g.live, g.synthetic, r.first_ts, r.last_ts
  from g
  left join public.campaigns cp on cp.id = g.k
  cross join r
  order by g.total desc, g.k asc;
$$;

create or replace function public.agent_themes_for_sku(p_sku text)
returns table (key text, label text, total bigint, live bigint, synthetic bigint, first_ts timestamptz, last_ts timestamptz)
language sql
stable
security invoker
set search_path = ''
as $$
  with f as (
    select unnest(fb.themes) as theme, fb.source, fb.ts
    from public.feedback fb
    where fb.sku_id = p_sku
  ),
  g as (
    select f.theme as k,
           count(*) as total,
           count(*) filter (where f.source = 'live') as live,
           count(*) filter (where f.source = 'synthetic') as synthetic
    from f
    group by f.theme
  ),
  r as (select min(f.ts) as first_ts, max(f.ts) as last_ts from f)
  select g.k, upper(left(g.k, 1)) || substr(g.k, 2), g.total, g.live, g.synthetic, r.first_ts, r.last_ts
  from g
  cross join r
  order by g.total desc, g.k asc;
$$;

revoke all on function public.agent_scans_by_code(text) from public, anon, authenticated;
revoke all on function public.agent_feedback_visits_by_campaign() from public, anon, authenticated;
revoke all on function public.agent_themes_for_sku(text) from public, anon, authenticated;
grant execute on function public.agent_scans_by_code(text) to service_role;
grant execute on function public.agent_feedback_visits_by_campaign() to service_role;
grant execute on function public.agent_themes_for_sku(text) to service_role;
