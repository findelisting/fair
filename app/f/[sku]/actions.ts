'use server'

import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { skuById } from '@/lib/catalog'
import { validateFeedback, valuesOf, type FormState } from '@/lib/feedback'
import { cleanParams, linkQuery } from '@/lib/params'
import { clientAddress, createLimiter } from '@/lib/rateLimit'
import { supabaseServer } from '@/lib/supabaseServer'

// Feedback Server Action (ADR 0003, decisions 6 to 9; spec section 6).
// Works with and without JavaScript. On success it redirects to the thank-you page,
// so a refresh cannot send the answer again. On failure it returns the errors and the
// typed values, never putting typed text into a URL.

// 20 answers per minute per address. In memory, per server instance; the address is never stored.
const limiter = createLimiter(20, 60_000)
const SAVE_TIMEOUT_MS = 5_000

function thanksUrl(formData: FormData): string {
  const skuId = String(formData.get('sku') ?? '')
  const sku = skuById(skuId)
  if (!sku) return '/'
  const p = cleanParams({ campaign: String(formData.get('campaign') ?? ''), market: String(formData.get('market') ?? '') })
  return `/f/${sku.id}/thanks?${linkQuery({ sku: sku.id }, p)}`
}

export async function submitFeedback(_prev: FormState, formData: FormData): Promise<FormState> {
  const values = valuesOf(formData)

  // 1. Honeypot: a bot filled the hidden field. Say thanks, store nothing.
  if (String(formData.get('website') ?? '').trim() !== '') redirect(thanksUrl(formData))

  // 2. Rate limit: a clear message, never a silent loss.
  if (!limiter.allow(clientAddress(await headers()))) {
    return { status: 'error', error: 'rate-limited', fields: {}, values }
  }

  // 3. Validation (includes contact redaction and parameter cleaning).
  const v = validateFeedback(formData)
  if (!v.ok) return { status: 'error', error: 'invalid', fields: v.fields, values: v.values }

  // 4. Save once: a second submit with the same token is ignored.
  const started = Date.now()
  try {
    const { error } = await supabaseServer()
      .from('feedback')
      .upsert(v.row, { onConflict: 'submission_id', ignoreDuplicates: true })
      .abortSignal(AbortSignal.timeout(SAVE_TIMEOUT_MS))
    if (error) throw new Error(`${error.code ?? ''} ${error.message}`.trim())
  } catch (e) {
    const msg = (e instanceof Error ? e.message : String(e)).slice(0, 200)
    console.error(`[feedback] sku=${v.row.sku_id} reason=error ms=${Date.now() - started}: ${msg}`)
    return { status: 'error', error: 'unavailable', fields: {}, values }
  }

  // 5. Success.
  redirect(thanksUrl(formData))
}
