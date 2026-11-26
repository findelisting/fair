'use client'

import { useEffect, useState } from 'react'
import { ThumbsDown, ThumbsUp } from 'lucide-react'

// "Useful and accurate?" (ADR 0001 amendment 2, ADR 0007 decision 5). Optional, once per card per browser session.
// Remembered in sessionStorage, never in a cookie. Sends card id and answer only.
const KEY = (cardId: string) => `insight-check:${cardId}`

export function InsightCheck({ cardId }: { cardId: string }) {
  const [done, setDone] = useState(false)

  useEffect(() => {
    try {
      // Reading browser-only storage after mount keeps server and client markup the same.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      if (sessionStorage.getItem(KEY(cardId))) setDone(true)
    } catch {
      /* storage blocked: ask again, no harm */
    }
  }, [cardId])

  const send = async (answer: 'up' | 'down') => {
    setDone(true)
    try {
      sessionStorage.setItem(KEY(cardId), answer)
    } catch {
      /* ignore */
    }
    await fetch('/api/insight-check', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ cardId, answer }),
    }).catch(() => undefined)
  }

  return (
    <div data-testid="insight-check" className="mt-3 flex items-center gap-2 border-t border-line pt-2 text-xs text-ink-tertiary">
      {done ? (
        <span>Thanks for the feedback.</span>
      ) : (
        <>
          <span>Useful and accurate?</span>
          <button type="button" aria-label="Yes" onClick={() => send('up')} className="rounded-full p-1 hover:bg-canvas hover:text-green">
            <ThumbsUp aria-hidden className="h-3.5 w-3.5" />
          </button>
          <button type="button" aria-label="No" onClick={() => send('down')} className="rounded-full p-1 hover:bg-canvas hover:text-ink">
            <ThumbsDown aria-hidden className="h-3.5 w-3.5" />
          </button>
        </>
      )}
    </div>
  )
}
