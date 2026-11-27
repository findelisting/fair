import { expect, test } from '@playwright/test'
import { QUESTIONS } from '../../lib/agent'
import { EVIDENCE, IDEAS_EVIDENCE, PANEL_EVIDENCE, QUESTION_EVIDENCE } from '../../lib/evidence'

// ADR 0010: evidence tags.

test('EV-1: every agent question has an evidence tag', () => {
  for (const q of QUESTIONS) expect(EVIDENCE[QUESTION_EVIDENCE[q.id]], q.id).toBeDefined()
})

test('EV-2: every live panel has an evidence tag, with the agreed mapping', () => {
  expect(PANEL_EVIDENCE).toEqual({
    'panel-scans': 'observed',
    'panel-page-views': 'observed',
    'panel-feedback': 'observed',
    'panel-web': 'attributed',
  })
  expect(IDEAS_EVIDENCE).toBe('correlation')
})

test('EV-3: every kind has a label and a meaning; attributed never claims cause', () => {
  expect(Object.keys(EVIDENCE).sort()).toEqual(['attributed', 'correlation', 'observed', 'reference'])
  for (const [k, v] of Object.entries(EVIDENCE)) {
    expect(v.label.trim(), k).not.toBe('')
    expect(v.meaning.trim(), k).not.toBe('')
  }
  expect(EVIDENCE.attributed.meaning).not.toMatch(/\bcaus/i)
})
