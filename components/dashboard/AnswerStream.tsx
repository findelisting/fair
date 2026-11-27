'use client'

import { useEffect, useLayoutEffect, useState } from 'react'
import { useReducedMotion } from './motion'

// Streams a prepared agent answer (ADR 0012, decision 8). The server renders the full answer, so it reads
// without JavaScript; in the browser a short status line comes first, then the text at about 40
// characters per second, then the sources. Stop shows the rest at once; reduced motion skips the stream.

const STATUS_MS = 700
const CHAR_MS = 25

type Phase = 'status' | 'stream' | 'done'

export function AnswerStream({ text, status, children }: { text: string; status: string; children?: React.ReactNode }) {
  const reduced = useReducedMotion()
  const [phase, setPhase] = useState<Phase>('done')
  const [n, setN] = useState(text.length)

  // Before paint, so the full text never flashes before the stream.
  useLayoutEffect(() => {
    if (reduced) {
      // The server rendered the full answer; the stream starts only in the browser, before paint.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setPhase('done')
      setN(text.length)
      return
    }
    setPhase('status')
    setN(0)
    const t = setTimeout(() => setPhase('stream'), STATUS_MS)
    return () => clearTimeout(t)
  }, [text, reduced])

  useEffect(() => {
    if (phase !== 'stream') return
    const id = setInterval(() => {
      setN((x) => {
        if (x + 1 >= text.length) {
          clearInterval(id)
          setPhase('done')
          return text.length
        }
        return x + 1
      })
    }, CHAR_MS)
    return () => clearInterval(id)
  }, [phase, text])

  const stop = () => {
    setN(text.length)
    setPhase('done')
  }

  return (
    <>
      {phase === 'status' && (
        <p data-testid="agent-status" className="fade-in text-sm text-ink-secondary">
          {status}
        </p>
      )}
      <p data-testid="agent-answer-text" aria-busy={phase !== 'done'} className="font-display text-lg font-semibold leading-snug">
        {/* Screen readers get the whole answer once; the moving text is hidden from them. */}
        <span className="sr-only">{text}</span>
        <span aria-hidden>
          {phase === 'status' ? '' : text.slice(0, n)}
          {phase === 'stream' && <span className="ml-0.5 inline-block h-4 w-1.5 rounded-sm bg-green align-middle" />}
        </span>
      </p>
      {phase !== 'done' ? (
        <button type="button" onClick={stop} data-testid="agent-stop" className="min-h-9 self-start rounded-full px-3 text-sm font-semibold text-green-deep ring-1 ring-inset ring-line hover:bg-canvas">
          Stop
        </button>
      ) : (
        <div className="fade-in">{children}</div>
      )}
    </>
  )
}
