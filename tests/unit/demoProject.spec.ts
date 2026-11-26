import { expect, test } from '@playwright/test'
import { assertDemoProject, dbUrlMatchesProject, normalizeDbUrl, projectRefFromUrl } from '../../lib/demoProject'

const REF = 'abcdefghijklmnopqrst'
const OTHER = 'zyxwvutsrqponmlkjihg'

test.describe('projectRefFromUrl', () => {
  test('reads the ref from a project URL', () => {
    expect(projectRefFromUrl(`https://${REF}.supabase.co`)).toBe(REF)
    expect(projectRefFromUrl(`https://${REF}.supabase.co/`)).toBe(REF)
  })
  test('rejects anything else', () => {
    expect(projectRefFromUrl(undefined)).toBeNull()
    expect(projectRefFromUrl('')).toBeNull()
    expect(projectRefFromUrl(`http://${REF}.supabase.co`)).toBeNull()
    expect(projectRefFromUrl(`https://${REF}.supabase.co.evil.com`)).toBeNull()
    expect(projectRefFromUrl('https://example.com')).toBeNull()
  })
})

test.describe('assertDemoProject', () => {
  test('passes when URL and project ID match', () => {
    expect(assertDemoProject({ SUPABASE_URL: `https://${REF}.supabase.co`, DEMO_SUPABASE_PROJECT_ID: REF })).toBe(REF)
  })
  test('refuses a different project', () => {
    expect(() =>
      assertDemoProject({ SUPABASE_URL: `https://${OTHER}.supabase.co`, DEMO_SUPABASE_PROJECT_ID: REF }),
    ).toThrow(/Refusing to run/)
  })
  test('refuses when the project ID is missing', () => {
    expect(() => assertDemoProject({ SUPABASE_URL: `https://${REF}.supabase.co` })).toThrow(/DEMO_SUPABASE_PROJECT_ID/)
  })
  test('refuses when the URL is missing or malformed', () => {
    expect(() => assertDemoProject({ DEMO_SUPABASE_PROJECT_ID: REF })).toThrow(/SUPABASE_URL/)
    expect(() => assertDemoProject({ SUPABASE_URL: 'https://example.com', DEMO_SUPABASE_PROJECT_ID: REF })).toThrow(/SUPABASE_URL/)
  })
})

test.describe('dbUrlMatchesProject', () => {
  test('accepts the pooler and direct forms for the right project', () => {
    expect(dbUrlMatchesProject(`postgresql://postgres.${REF}:pw@aws-0-eu-west-1.pooler.supabase.com:5432/postgres`, REF)).toBe(true)
    expect(dbUrlMatchesProject(`postgresql://postgres:pw@db.${REF}.supabase.co:5432/postgres`, REF)).toBe(true)
  })
  test('rejects another project, bad URLs and missing values', () => {
    expect(dbUrlMatchesProject(`postgresql://postgres.${OTHER}:pw@aws-0-eu-west-1.pooler.supabase.com:5432/postgres`, REF)).toBe(false)
    expect(dbUrlMatchesProject(`postgresql://postgres:pw@db.${OTHER}.supabase.co:5432/postgres`, REF)).toBe(false)
    expect(dbUrlMatchesProject('not a url', REF)).toBe(false)
    expect(dbUrlMatchesProject(`https://db.${REF}.supabase.co`, REF)).toBe(false)
    expect(dbUrlMatchesProject(undefined, REF)).toBe(false)
  })
})

test.describe('normalizeDbUrl', () => {
  const host = `aws-0-eu-west-1.pooler.supabase.com:5432/postgres`
  test('encodes a password with special characters', () => {
    const r = normalizeDbUrl(`postgresql://postgres.${REF}:p@ss&w:rd^1@${host}`)
    expect(r?.password).toBe('p@ss&w:rd^1')
    expect(r?.url).toBe(`postgresql://postgres.${REF}:${encodeURIComponent('p@ss&w:rd^1')}@${host}`)
    expect(dbUrlMatchesProject(r!.url, REF)).toBe(true)
    expect(new URL(r!.url).hostname).toBe('aws-0-eu-west-1.pooler.supabase.com')
  })
  test('does not encode an already encoded password twice', () => {
    const r = normalizeDbUrl(`postgresql://postgres.${REF}:p%40ss@${host}`)
    expect(r?.password).toBe('p@ss')
    expect(r?.url).toBe(`postgresql://postgres.${REF}:p%40ss@${host}`)
  })
  test('rejects strings that are not connection strings', () => {
    expect(normalizeDbUrl('https://example.com')).toBeNull()
    expect(normalizeDbUrl(`postgresql://postgres.${REF}@${host}`)).toBeNull()
    expect(normalizeDbUrl('postgresql://')).toBeNull()
  })
})
