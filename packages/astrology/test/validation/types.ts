/**
 * Types for §9 ephemeris-validation harness.
 *
 * Scope: validating @celestia/astrology outputs against reference data.
 * See ../../../.planning/phases/09-ephemeris-validation/09-01-PRECISION-FLOOR.md
 * for locked thresholds and decision rationale.
 */

import type { Planet, AspectType } from '../../src/types'

export type Body = Planet

export type ReferenceSource =
  | 'jpl' // JPL Horizons — primary for planetary longitudes (§9.2 Tier 1)
  | 'astronomyEngine' // Secondary sanity check — planets only (scope-limited)
  | 'inlineMeeusNode' // Mean Node vs Meeus Ch. 47 polynomial (§9.2 Tier 2)
  | 'inlinePlacidus' // Inline Meeus-based Placidus reference (§9.3 Tier 3)
  | 'astrocom' // Optional post-§9.6 spot-check; demoted from primary per drift entry 6
  | 'nativeSwisseph' // Moshier-vs-SE-files floor check (QE II only)

export interface TestCase {
  id: string
  name: string
  kind: 'famous' | 'synthetic' | 'reference'
  rodden?: 'AA' | 'A' | 'B' | 'C' // famous cases only; AA required
  birthDate: string // 'YYYY-MM-DD' (local)
  birthTime?: string // 'HH:MM' (local); omit if unknown
  birthTimeKnown: boolean
  lat: number // decimal degrees, +N/-S
  lon: number // decimal degrees, +E/-W
  city?: string
  notes?: string
  sources?: string[] // citation URLs (Astro-Databank, etc.)
  /**
   * Skip intermediate Placidus cusps (2, 3, 5, 6, 8, 9, 11, 12) in the Tier 3
   * houses comparison. Set true for polar-circle cases where Placidus is
   * mathematically undefined (|tan φ · tan D| ≥ 1) and the inline reference
   * returns NaN. ASC / MC / Cusps 1, 4, 7, 10 still compare normally.
   */
  skipIntermediateCusps?: boolean
  /**
   * Mark the case as a far-range [observation] case. Primary-reference
   * (Tier 1, JPL) threshold violations for this case are classified as
   * observations rather than propagating to case-level pause-and-fix.
   * Per-body rows still report their raw status for the report tables; the
   * case-level overallStatus treats Tier-1 exceedances as 'pass' so the
   * harness assertion reflects the user-classified [observation] ruling
   * rather than the mechanical pause-and-fix trigger. Use for cases outside
   * the ~1900-2100 modern-era window where observed deltas reflect
   * inter-ephemeris-generation divergence (DE404 vs DE441) rather than a
   * bug in the library under test.
   */
  farRangeObservation?: boolean
}

export interface PlanetReference {
  body: Body
  longitude: number // ecliptic longitude, 0-360 degrees
}

export interface HouseReference {
  cusps: number[] // length 12, cusps 1..12 in ecliptic longitude
  ascendant: number
  mc: number
}

export interface AspectReference {
  body1: Body
  body2: Body
  type: AspectType
  orb: number // degrees
  applying: boolean
}

export interface ReferenceData {
  caseId: string
  planets?: Partial<Record<ReferenceSource, PlanetReference[]>>
  houses?: Partial<Record<ReferenceSource, HouseReference>>
  aspects?: Partial<Record<ReferenceSource, AspectReference[]>>
}

export type Status = 'pass' | 'queue' | 'pause-and-fix'

export interface PlanetComparison {
  body: Body
  celestiaLongitude: number
  referenceLongitude: number
  referenceSource: ReferenceSource
  deltaArcsec: number
  threshold: number
  status: Status
}

export interface HouseCuspComparison {
  cuspIndex: number // 1..12 for cusps, 0 for ASC, -1 for MC in report context
  label: string // 'ASC' | 'MC' | 'Cusp 1' ... 'Cusp 12'
  celestia: number
  reference: number
  referenceSource: ReferenceSource
  deltaArcsec: number
  threshold: number
  status: Status
}

export interface AspectComparison {
  body1: Body
  body2: Body
  celestiaType?: AspectType
  referenceType?: AspectType
  celestiaOrb?: number
  referenceOrb?: number
  celestiaApplying?: boolean
  referenceApplying?: boolean
  typeMatch: boolean
  applyingMatch: boolean
  orbDeltaArcsec?: number
  status: Status
}

export interface CaseComparisonResult {
  testCase: TestCase
  planetComparisons: PlanetComparison[]
  houseComparisons: HouseCuspComparison[]
  aspectComparisons: AspectComparison[]
  overallStatus: Status
}
