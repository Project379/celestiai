import { useSyncExternalStore } from 'react'

/**
 * Clear zones for the background starfield (founder rule, 2026-10-09): on a screen that opts in,
 * no star may sit within STAR_CLEAR_PX of any text or tappable element, so a star never reads as
 * punctuation next to a word. A screen reports the rectangles of its text lines and tappable
 * blocks (window coordinates, measured on layout); AmbientBackground reads them and skips every
 * star that would land inside one (grown by the padding and the star's own radius).
 *
 * Module-level store because the starfield is mounted once, above all the tab screens, while
 * the zones come from whichever screen is on show. A screen clears its zones when it unmounts.
 */
export const STAR_CLEAR_PX = 14

export interface ClearRect {
  x: number
  y: number
  w: number
  h: number
}

const zones = new Map<string, ClearRect[]>()
const listeners = new Set<() => void>()
let snapshot: ClearRect[] = []
// Zones apply only while the reporting screen is on show (it switches this on focus, off on blur).
let enabled = false
let timer: ReturnType<typeof setTimeout> | null = null

function emit() {
  timer = null
  snapshot = enabled ? Array.from(zones.values()).flat() : []
  listeners.forEach((l) => l())
}

/** Replace (or, with null, remove) the rects of one element. Batched, so a layout burst re-filters once. */
export function setClearZones(id: string, rects: ClearRect[] | null) {
  if (rects === null) zones.delete(id)
  else zones.set(id, rects)
  if (timer === null) timer = setTimeout(emit, 80)
}

export function setClearZonesEnabled(on: boolean) {
  enabled = on
  emit()
}

const subscribe = (l: () => void) => {
  listeners.add(l)
  return () => {
    listeners.delete(l)
  }
}

/** All reported rects, in window coordinates. Empty array on a screen that did not opt in. */
export function useClearZones(): ClearRect[] {
  return useSyncExternalStore(subscribe, () => snapshot)
}

/** True when a star of radius `r` at (x, y) keeps at least `pad` px from every rect. */
export function starIsClear(x: number, y: number, r: number, rects: ClearRect[], pad: number = STAR_CLEAR_PX): boolean {
  const m = pad + r
  for (const z of rects) {
    if (x > z.x - m && x < z.x + z.w + m && y > z.y - m && y < z.y + z.h + m) return false
  }
  return true
}
