'use client'

import { DashboardTile } from './DashboardTile'

/**
 * Днес bento tile — transit headline. Placeholder wording until a real
 * /api/transits/today-headline is wired. Taps through to /transits.
 *
 * Phase B: replace hint with a real hot-aspect string pulled from the
 * user's natal × current sky calculation (swisseph).
 */
export function TransitTile() {
  return (
    <DashboardTile
      href="/transits"
      eyebrow="Транзит"
      title="Небесно време"
      hint="Виж днешните аспекти"
      accent="slate"
    />
  )
}
