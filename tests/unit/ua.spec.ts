import { expect, test } from '@playwright/test'
import { deviceType, isBot, language } from '../../lib/ua'

// Spec: docs/specs/slice-2-qr-redirect.md section 7.1

const UA = {
  iphone: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.1 Mobile/15E148 Safari/604.1',
  androidPhone: 'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36',
  androidTablet: 'Mozilla/5.0 (Linux; Android 13; SM-X710) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
  ipad: 'Mozilla/5.0 (iPad; CPU OS 17_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.6 Mobile/15E148 Safari/604.1',
  windows: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
  mac: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 14_6) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.1 Safari/605.1.15',
  cubotPhone: 'Mozilla/5.0 (Linux; Android 10; CUBOT X30) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36',
}

const PREVIEW_AGENTS = [
  'WhatsApp/2.24.21.79 A',
  'facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)',
  // iMessage link previews identify like this:
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_11_1) AppleWebKit/601.2.4 (KHTML, like Gecko) Version/9.0.1 Safari/601.2.4 facebookexternalhit/1.1 Facebot Twitterbot/1.0',
  'Twitterbot/1.0',
  'Slackbot-LinkExpanding 1.0 (+https://api.slack.com/robots)',
  'Slack-ImgProxy (+https://api.slack.com/robots)',
  'TelegramBot (like TwitterBot)',
  'Mozilla/5.0 (compatible; Discordbot/2.0; +https://discordapp.com)',
  'LinkedInBot/1.0 (compatible; Mozilla/5.0; Apache-HttpClient +http://www.linkedin.com)',
  'Mozilla/5.0 (Windows NT 6.1; WOW64) SkypeUriPreview Preview/0.5 skype-url-preview@microsoft.com',
  'Microsoft Office/16.0 (Windows NT 10.0; Microsoft Outlook 16.0.17928; Pro)',
  'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)',
  'Mozilla/5.0 (compatible; bingbot/2.0; +http://www.bing.com/bingbot.htm)',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_5) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/13.1.1 Safari/605.1.15 (Applebot/0.1; +http://www.apple.com/go/applebot)',
  'curl/8.9.1',
  'Wget/1.21.4',
  'python-requests/2.32.3',
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/131.0.0.0 Safari/537.36',
  'SomeCrawler/1.0',
  'AhrefsBot/7.0',
]

test('U-UA-1: iPhone Safari is mobile and not a bot', () => {
  expect(deviceType(UA.iphone)).toBe('mobile')
  expect(isBot(UA.iphone)).toBe(false)
})

test('U-UA-2: Android phone is mobile', () => {
  expect(deviceType(UA.androidPhone)).toBe('mobile')
  expect(isBot(UA.androidPhone)).toBe(false)
})

test('U-UA-3: Android tablet (no "Mobile") is tablet', () => {
  expect(deviceType(UA.androidTablet)).toBe('tablet')
})

test('U-UA-4: iPad is tablet', () => {
  expect(deviceType(UA.ipad)).toBe('tablet')
})

test('U-UA-5: Windows and macOS browsers are desktop', () => {
  expect(deviceType(UA.windows)).toBe('desktop')
  expect(deviceType(UA.mac)).toBe('desktop')
  expect(isBot(UA.windows)).toBe(false)
  expect(isBot(UA.mac)).toBe(false)
})

test('U-UA-6: a missing or empty user agent is unknown and a bot', () => {
  for (const ua of [undefined, null, '', '   ']) {
    expect(deviceType(ua)).toBe('unknown')
    expect(isBot(ua)).toBe(true)
  }
})

test('U-UA-7: every link-preview and crawler agent is a bot', () => {
  for (const ua of PREVIEW_AGENTS) expect(isBot(ua), ua).toBe(true)
})

test('U-UA-7b: a phone brand containing "bot" (CUBOT) is not a bot', () => {
  expect(isBot(UA.cubotPhone)).toBe(false)
  expect(deviceType(UA.cubotPhone)).toBe('mobile')
})

test('U-UA-8: the first Accept-Language tag, lowercased, without weight', () => {
  expect(language('de-AT,de;q=0.9,en;q=0.8')).toBe('de-at')
  expect(language('en-GB')).toBe('en-gb')
  expect(language('fr;q=0.7')).toBe('fr')
})

test('U-UA-9: junk Accept-Language values become null', () => {
  for (const h of ['*', 'de_AT', 'x'.repeat(40), '', undefined, null, '12-34']) {
    expect(language(h), String(h)).toBeNull()
  }
})

test('U-UA-10: the end-to-end test marker is kept', () => {
  expect(language('x-e2e')).toBe('x-e2e')
  expect(language('X-E2E')).toBe('x-e2e')
})
