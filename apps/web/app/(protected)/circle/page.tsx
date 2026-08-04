import type { Metadata } from 'next'
import { CircleEmptyState } from '@/components/circle/CircleEmptyState'

export const metadata: Metadata = {
  title: 'Кръг',
  description: 'Хората, с които се разбираш през звездите — партньор, приятел, crush',
}

/**
 * Кръг — the people-graph tab. Primary premium spine per
 * .planning/research/MOBILE_UX_RESEARCH.md §1, §2.3.
 *
 * Phase A: empty-state placeholder (§12.2 — "highest-leverage screen in the app").
 * Phase B: add-person flow + ghost profiles + synastry + paid daily circle transits.
 */
export default function CirclePage() {
  return <CircleEmptyState />
}
