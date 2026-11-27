// Evidence tags (ADR 0010): how directly each number is known.
// Separate from the Live / Synthetic data badge, which says where a number comes from.
import type { QuestionId } from './agent'

export type EvidenceKind = 'observed' | 'attributed' | 'correlation' | 'reference'

export const EVIDENCE: Record<EvidenceKind, { label: string; meaning: string }> = {
  observed: { label: 'Observed', meaning: 'Counted directly: a scan, a page visit or a feedback answer.' },
  attributed: { label: 'Attributed', meaning: 'Linked to a product or campaign through a code or campaign tag.' },
  correlation: { label: 'Correlation', meaning: 'A pattern seen across the data. Worth testing, not proof.' },
  reference: { label: 'Public reference', meaning: 'From a public outside source, shown with its link and date.' },
}

export type LivePanelId = 'panel-scans' | 'panel-page-views' | 'panel-feedback' | 'panel-web'

export const PANEL_EVIDENCE: Record<LivePanelId, EvidenceKind> = {
  'panel-scans': 'observed',
  'panel-page-views': 'observed',
  'panel-feedback': 'observed',
  'panel-web': 'attributed',
}

export const QUESTION_EVIDENCE: Record<QuestionId, EvidenceKind> = {
  'top-packaging-at': 'observed',
  'feedback-visits-by-campaign': 'attributed',
  'top-theme-dark-92': 'observed',
  'comparable-dark-bars': 'reference',
}

export const IDEAS_EVIDENCE: EvidenceKind = 'correlation'
