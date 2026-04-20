/**
 * Locked §9.2 thresholds — single source of truth.
 *
 * Source: .planning/phases/09-ephemeris-validation/09-01-PRECISION-FLOOR.md
 *   (user-approved 2026-04-20; Mean Node reference-source correction same day)
 * DO NOT EDIT without a corresponding planning-doc update and user sign-off.
 *
 * PER-BODY REFERENCE SOURCE:
 *   Sun + 7 planets + Moon: JPL Horizons (physical-reality reference).
 *   Mean Node: sweph Mean Node vs. Meeus Ch. 47 polynomial (independent
 *     implementation of the same ELP2000-85 secular formula used by sweph's
 *     Moshier mode). This is a code-path integrity check, NOT a physical-
 *     reality check. See 09-01-HARNESS.md § Node validation — explicit scope.
 *
 * The constant is named PRIMARY_THRESHOLDS_ARCSEC (not JPL_*) because the
 * reference source is heterogeneous across bodies — JPL for most, Meeus
 * polynomial for Mean Node.
 */

import type { Body, Status } from './types'

/** Primary threshold (arc-seconds) — see per-body reference source in the block comment above. */
export const PRIMARY_THRESHOLDS_ARCSEC: Record<Body, number> = {
  sun: 1,
  mercury: 1,
  venus: 1,
  mars: 1,
  jupiter: 1,
  saturn: 1,
  uranus: 1,
  neptune: 1,
  pluto: 1,
  moon: 3,
  // Meeus polynomial reference — not JPL. See block comment above.
  northNode: 20,
}

/** Pre-committed branching multipliers (user-decision, §9.1). */
export const PAUSE_AND_FIX_MULTIPLIER = 10
export const QUEUE_MULTIPLIER = 5

/**
 * The 9 non-Moon non-Node bodies to which the systemic-issue composite rule applies.
 * Moon and Mean Node classify independently.
 */
export const SYSTEMIC_RULE_BODIES: Body[] = [
  'sun',
  'mercury',
  'venus',
  'mars',
  'jupiter',
  'saturn',
  'uranus',
  'neptune',
  'pluto',
]

/** Secondary sanity-check threshold (arc-seconds) vs Astronomy Engine — planets only. */
export const ASTRONOMY_ENGINE_THRESHOLD_ARCSEC = 60

/** Houses vs astro.com (arc-seconds). */
export const HOUSE_THRESHOLD_ARCSEC = 60

/** Aspect orbs vs astro.com (arc-seconds). Type + applying/separating must match exactly. */
export const ASPECT_ORB_THRESHOLD_ARCSEC = 60

/**
 * Classify a single body's delta against its threshold.
 * - pass: delta ≤ threshold
 * - queue: threshold < delta ≤ threshold × PAUSE_AND_FIX_MULTIPLIER
 * - pause-and-fix: delta > threshold × PAUSE_AND_FIX_MULTIPLIER
 */
export function classifyBodyStatus(body: Body, deltaArcsec: number): Status {
  const threshold = PRIMARY_THRESHOLDS_ARCSEC[body]
  if (deltaArcsec <= threshold) return 'pass'
  if (deltaArcsec > threshold * PAUSE_AND_FIX_MULTIPLIER) return 'pause-and-fix'
  return 'queue'
}

/**
 * Composite status for the 9-planet batch per §9.2 branching rule:
 * - pass: all ≤ 1″
 * - pause-and-fix: any planet > 10″ OR >1 planet > 5″
 * - queue: otherwise (any planet > 1″, no pause-and-fix trigger)
 *
 * Moon and Node deltas are ignored here — they classify independently.
 */
export function classifyPlanetBatch(
  deltas: Array<{ body: Body; deltaArcsec: number }>,
): Status {
  const planetDeltas = deltas.filter((d) =>
    SYSTEMIC_RULE_BODIES.includes(d.body),
  )

  if (planetDeltas.length === 0) return 'pass'

  const anyAbovePauseCeiling = planetDeltas.some(
    (d) => d.deltaArcsec > PRIMARY_THRESHOLDS_ARCSEC[d.body] * PAUSE_AND_FIX_MULTIPLIER,
  )
  if (anyAbovePauseCeiling) return 'pause-and-fix'

  const countAboveQueueCeiling = planetDeltas.filter(
    (d) => d.deltaArcsec > PRIMARY_THRESHOLDS_ARCSEC[d.body] * QUEUE_MULTIPLIER,
  ).length
  if (countAboveQueueCeiling > 1) return 'pause-and-fix'

  const anyAboveThreshold = planetDeltas.some(
    (d) => d.deltaArcsec > PRIMARY_THRESHOLDS_ARCSEC[d.body],
  )
  return anyAboveThreshold ? 'queue' : 'pass'
}

/** Take most-severe of several statuses. Severity order: pause-and-fix > queue > pass. */
export function mostSevere(statuses: Status[]): Status {
  if (statuses.includes('pause-and-fix')) return 'pause-and-fix'
  if (statuses.includes('queue')) return 'queue'
  return 'pass'
}
