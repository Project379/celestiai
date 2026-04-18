'use client'

import { DashboardTile } from './DashboardTile'

/**
 * Днес bento tile — daily touch from the user's Кръг. Premium wedge
 * surface (MOBILE_UX_RESEARCH §4 Rule 1). Non-paying users see the
 * teaser; tap → upsell inside /circle.
 *
 * Phase B: replace with a real "today in your circle" pull (e.g.,
 * "Venus минава през Марса на Емма"). For now, the empty-state CTA.
 */
export function CircleTile() {
  return (
    <DashboardTile
      href="/circle"
      eyebrow="Кръг"
      title="Добави човек"
      hint="партньор · приятел · crush"
      accent="rose"
    />
  )
}
