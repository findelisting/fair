import 'server-only'
import type { CodeTarget } from './catalog'
import type { ScanInput } from './redirect'
import { supabaseServer } from './supabaseServer'

/** Calls record_scan() with the service-role client. Throws on any database error (the redirect then falls back). */
export async function recordScan(input: ScanInput, signal: AbortSignal): Promise<CodeTarget | null> {
  const { data, error } = await supabaseServer()
    .rpc('record_scan', {
      p_code: input.code,
      p_record: input.record,
      p_device: input.device,
      p_language: input.language,
      p_is_bot: input.isBot,
    })
    .abortSignal(signal)
  if (error) throw new Error(`record_scan failed: ${error.code ?? ''} ${error.message}`.trim())
  const rows = (data ?? []) as CodeTarget[]
  return rows[0] ?? null
}
