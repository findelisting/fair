'use client'

import { useActionState, useState } from 'react'
import { submitFeedback } from '@/app/f/[sku]/actions'
import { FREE_TEXT_MAX, type FormState } from '@/lib/feedback'
import { TASTE_NOTES } from '@/lib/themes'
import { RatingInput } from './RatingInput'

// The only client component on the public pages (ADR 0003, decision 8).
// useActionState keeps errors and typed values in the action's response, never in the URL,
// and the form still submits when JavaScript has not loaded or is off.

const MESSAGES: Record<'unavailable' | 'rate-limited' | 'invalid', string> = {
  unavailable: 'Could not save your answer. Please try again.',
  'rate-limited': 'Too many answers from this network. Please try again in a minute.',
  invalid: 'Please check the highlighted answers.',
}

interface Props {
  sku: string
  campaign: string | null
  market: string | null
  submissionId: string
}

const initial: FormState = { status: 'idle' }

export function FeedbackForm({ sku, campaign, market, submissionId }: Props) {
  const [state, formAction, pending] = useActionState(submitFeedback, initial)
  const values = state.status === 'error' ? state.values : undefined
  const fields = state.status === 'error' ? state.fields : {}
  const [count, setCount] = useState<number | null>(null)

  return (
    // The key remounts the fields after each answer from the server, so they show the returned values.
    <form key={JSON.stringify(state)} action={formAction} className="flex flex-col gap-6">
      {state.status === 'error' && (
        <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-sm font-medium text-red-800 ring-1 ring-red-200">
          {MESSAGES[state.error]}
          {fields.sku || fields.submission_id ? ` ${fields.sku ?? fields.submission_id}` : ''}
        </p>
      )}

      <input type="hidden" name="sku" value={sku} />
      <input type="hidden" name="campaign" value={campaign ?? ''} />
      <input type="hidden" name="market" value={market ?? ''} />
      <input type="hidden" name="submission_id" value={submissionId} />
      {/* Honeypot: hidden from people and screen readers, bots tend to fill it. */}
      <div aria-hidden="true" className="absolute -left-[10000px] h-px w-px overflow-hidden">
        <label>
          Website
          <input type="text" name="website" tabIndex={-1} autoComplete="off" defaultValue="" />
        </label>
      </div>

      <RatingInput defaultValue={values?.rating} error={fields.rating} />

      <fieldset className="flex flex-col gap-2" aria-describedby={fields.taste_note ? 'taste-error' : undefined}>
        <legend className="mb-2 text-base font-semibold">How does it taste to you?</legend>
        <div className="flex flex-wrap gap-2">
          {TASTE_NOTES.map((n) => (
            <label
              key={n.value}
              className="flex min-h-12 cursor-pointer items-center rounded-full bg-surface px-4 py-2 text-sm font-medium ring-1 ring-inset ring-cream-deep transition-colors hover:ring-caramel has-[:checked]:bg-cocoa has-[:checked]:text-cream has-[:checked]:ring-cocoa has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-caramel"
            >
              <input
                type="radio"
                name="taste_note"
                value={n.value}
                required
                defaultChecked={values?.taste_note === n.value}
                className="sr-only"
              />
              {n.label}
            </label>
          ))}
        </div>
        {fields.taste_note && (
          <p id="taste-error" className="text-sm font-medium text-red-700">
            {fields.taste_note}
          </p>
        )}
      </fieldset>

      <div className="flex flex-col gap-2">
        <label htmlFor="free_text" className="text-base font-semibold">
          Anything else? <span className="font-normal text-ink-tertiary">(optional)</span>
        </label>
        <textarea
          id="free_text"
          name="free_text"
          rows={4}
          maxLength={FREE_TEXT_MAX}
          defaultValue={values?.free_text ?? ''}
          onInput={(e) => setCount(e.currentTarget.value.length)}
          placeholder="Please don't enter names, email addresses or phone numbers."
          className="rounded-2xl bg-surface p-4 text-base ring-1 ring-inset ring-cream-deep focus:outline-none focus:ring-2 focus:ring-caramel"
        />
        {count !== null && (
          <p className="text-right text-xs text-ink-tertiary" aria-live="polite">
            {count} / {FREE_TEXT_MAX}
          </p>
        )}
      </div>

      <button
        type="submit"
        disabled={pending}
        className="min-h-14 rounded-full bg-cocoa px-5 py-3 text-base font-semibold text-cream transition-colors hover:bg-cocoa-raised disabled:opacity-60"
      >
        {pending ? 'Sending…' : 'Send feedback'}
      </button>
    </form>
  )
}
