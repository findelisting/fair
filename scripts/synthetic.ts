// Loads the synthetic history (slice 5, ADR 0005) into the demo project.
// Called by npm run seed and npm run reset after the catalogue step.
// One database call replaces all synthetic rows; live rows are kept.
import type { SupabaseClient } from '@supabase/supabase-js'
import { berlinToday, generateSynthetic } from '../lib/synthetic'

export async function loadSynthetic(client: SupabaseClient): Promise<boolean> {
  const now = new Date()
  const today = berlinToday(now)
  const data = generateSynthetic({ today, now })
  const { error } = await client.rpc('replace_synthetic', { payload: data })
  if (error) {
    console.error(`Synthetic data failed, old synthetic rows kept: ${error.message}`)
    return false
  }
  console.log(
    `Synthetic data up to ${today} (Europe/Berlin): ${data.scan_events.length} scans, ${data.page_views.length} page views, ` +
      `${data.feedback.length} feedback, ${data.web_aggregates.length} web metric rows. Reset again the day before a demo.`,
  )
  return true
}
