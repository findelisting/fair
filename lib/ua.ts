// Device type, bot detection and language from request headers.
// Spec: docs/specs/slice-2-qr-redirect.md sections 4.2 to 4.4. Nothing here is stored except the results.

export type DeviceType = 'mobile' | 'tablet' | 'desktop' | 'unknown'

export function deviceType(ua: string | null | undefined): DeviceType {
  const s = ua?.trim() ?? ''
  if (!s) return 'unknown'
  if (/iPad|Tablet/i.test(s) || (/Android/i.test(s) && !/Mobile/i.test(s))) return 'tablet'
  if (/iPhone|iPod|Windows Phone|Mobile/i.test(s)) return 'mobile'
  if (/Windows NT|Macintosh|X11|CrOS/i.test(s)) return 'desktop'
  return 'unknown'
}

// Link previews and crawlers fetch a URL before (or instead of) a person.
// iMessage previews identify as "facebookexternalhit ... Facebot Twitterbot", so they match below.
const KNOWN_BOTS =
  /WhatsApp|facebookexternalhit|Facebot|Twitterbot|Slackbot|Slack-ImgProxy|TelegramBot|Discordbot|LinkedInBot|SkypeUriPreview|Microsoft Office|Googlebot|bingbot|Applebot|curl\/|wget\/|python-requests|HeadlessChrome/i

// Generic words, matched only when followed by "/", "-", ";", ")" or the end. This catches
// "AhrefsBot/7.0" and "SomeCrawler/1.0" but not phone names such as "CUBOT X30".
const GENERIC_BOTS = /(?:bot|crawler|spider)(?:[/\-;)]|$)|preview/i

/** True for link previews, crawlers, scripts, and a missing or empty user agent. */
export function isBot(ua: string | null | undefined): boolean {
  const s = ua?.trim() ?? ''
  if (!s) return true
  return KNOWN_BOTS.test(s) || GENERIC_BOTS.test(s)
}

const LANGUAGE_TAG = /^[a-z]{2,3}(?:-[a-z0-9]{2,8})?$/
const E2E_MARKER = 'x-e2e'

/** First Accept-Language tag, lowercased and without its weight; null when it is not a plain language tag. */
export function language(header: string | null | undefined): string | null {
  const first = header?.split(',')[0]?.split(';')[0]?.trim().toLowerCase() ?? ''
  if (first === E2E_MARKER) return first
  return LANGUAGE_TAG.test(first) ? first : null
}
