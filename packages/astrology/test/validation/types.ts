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
  | 'jpl' // JPL Horizons — primary for planetary longitudes
  | 'astronomyEngine' // Secondary sanity check — planets only (scope-limited)
  | 'astrocom' // Houses + aspects
  | 'nativeSwisseph' // Independent SE implementation — for wasm-vs-native spot-check

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
