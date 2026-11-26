// Signs tests in through the real login endpoint (ADR 0007, decision 1).
// The password comes from .env.local (DEMO_DASHBOARD_PASSWORD); it is never written into a test.
import { loadEnvConfig } from '@next/env'
import type { APIRequestContext, BrowserContext } from '@playwright/test'

export function demoPassword(): string {
  loadEnvConfig(process.cwd(), false, { info: () => {}, error: console.error })
  const p = process.env.DEMO_DASHBOARD_PASSWORD
  if (!p) throw new Error('DEMO_DASHBOARD_PASSWORD must be set in .env.local for the dashboard tests.')
  return p
}

/** Returns the session cookie as a "name=value" string for API requests. */
export async function sessionCookie(request: APIRequestContext): Promise<string> {
  const res = await request.post('/api/login', { form: { password: demoPassword(), next: '/dashboard' }, maxRedirects: 0 })
  const setCookie = res.headers()['set-cookie'] ?? ''
  const m = setCookie.match(/finde_demo_session=([^;]+)/)
  if (res.status() !== 303 || !m) throw new Error(`Login failed: ${res.status()}`)
  return `finde_demo_session=${m[1]}`
}

/** Puts the session cookie into a browser context. */
export async function signInContext(context: BrowserContext, request: APIRequestContext, baseURL: string): Promise<void> {
  const [name, value] = (await sessionCookie(request)).split('=')
  await context.addCookies([{ name, value, url: baseURL }])
}
