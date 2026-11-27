'use client'

import { useEffect, useState } from 'react'
import { ThumbsDown, ThumbsUp } from 'lucide-react'

// "Was this useful?" (ADR 0001 amendment 2, ADR 0007 decision 5). Optional, once per card per browser session.
// Remembered in sessionStorage, never in a cookie. Sends card id and answer only.
const KEY = (cardId: string) => `insight-check:${cardId}`

/** prompt: "Was this useful?" for a section, "Was this helpful?" for an agent answer (ADR 0012). */
export function InsightCheck({ cardId, prompt = 'Was this useful?', className = '' }: { cardId: string; prompt?: string; className?: string }) {
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
    <div data-testid="insight-check" className={`flex items-center gap-2 text-xs text-ink-tertiary ${className}`}>
      {done ? (
        <span>Thanks for the feedback.</span>
      ) : (
        <>
          <span>{prompt}</span>
          <button type="button" aria-label="Yes" onClick={() => send('up')} className="flex h-11 w-11 items-center justify-center rounded-full hover:bg-surface hover:text-green">
            <ThumbsUp aria-hidden className="h-3.5 w-3.5" />
          </button>
          <button type="button" aria-label="No" onClick={() => send('down')} className="flex h-11 w-11 items-center justify-center rounded-full hover:bg-surface hover:text-ink">
            <ThumbsDown aria-hidden className="h-3.5 w-3.5" />
          </button>
        </>
      )}
    </div>
  )
}
