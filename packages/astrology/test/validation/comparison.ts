/**
 * Comparison runner — takes a TestCase + ReferenceData, produces a CaseComparisonResult.
 *
 * Pure functions over Celestia chart output and reference-data snapshots.
 * No I/O, no network. Loader module handles filesystem.
 */

import { calculateNatalChart } from '../../src/calculator'
import type { ChartData, ChartInput, AspectData } from '../../src/types'
import { getJulianDayUTC } from '../../src/utils/julian-day'
import { localTimeToUTC } from '../../src/utils/timezone'

import { meanNodeLongitudeDeg } from './adapters/node-meeus'
import { computePlacidusCusps } from './adapters/placidus-inline'
import { longitudeDeltaArcsec } from './delta'
import {
  ASPECT_ORB_THRESHOLD_ARCSEC,
  ASTRONOMY_ENGINE_THRESHOLD_ARCSEC,
  HOUSE_THRESHOLD_ARCSEC,
  PRIMARY_THRESHOLDS_ARCSEC,
  SYSTEMIC_RULE_BODIES,
  classifyBodyStatus,
  classifyPlanetBatch,
  mostSevere,
} from './thresholds'
import type {
  AspectComparison,
  Body,
  CaseComparisonResult,
  HouseCuspComparison,
  PlanetComparison,
  ReferenceData,
  ReferenceSource,
  Status,
  TestCase,
} from './types'

function buildChartInput(testCase: TestCase): ChartInput {
  // Swiss Ephemeris expects a Date; localTimeToUTC in @celestia/astrology handles
  // local→UTC conversion internally given lat/lon. Pass a UTC-midnight anchor for the
  // birth date; calculator.ts uses the date components (year/month/day) from it.
  const date = new Date(`${testCase.birthDate}T00:00:00Z`)
  return {
    date,
    time: testCase.birthTime ?? null,
    lat: testCase.lat,
    lon: testCase.lon,
    birthTimeKnown: testCase.birthTimeKnown,
  }
}

function comparePlanets(
  chart: ChartData,
  testCase: TestCase,
  references: ReferenceData,
): PlanetComparison[] {
  const out: PlanetComparison[] = []
  const celestiaByBody = new Map<Body, number>()
  for (const p of chart.planets) {
    celestiaByBody.set(p.planet as Body, p.longitude)
  }

  // §9.2 Tier 2 — inline Meeus polynomial for Mean Node.
  const celestiaNode = celestiaByBody.get('northNode')
  if (celestiaNode !== undefined) {
    const jd = computeCaseJd(testCase)
    const meeusNode = meanNodeLongitudeDeg(jd)
    const delta = longitudeDeltaArcsec(celestiaNode, meeusNode)
    const threshold = PRIMARY_THRESHOLDS_ARCSEC.northNode
    out.push({
      body: 'northNode',
      celestiaLongitude: celestiaNode,
      referenceLongitude: meeusNode,
      referenceSource: 'inlineMeeusNode',
      deltaArcsec: delta,
      threshold,
      status: classifyBodyStatus('northNode', delta),
    })
  }

  const sources = Object.keys(references.planets ?? {}) as ReferenceSource[]
  for (const source of sources) {
    const refList = references.planets?.[source] ?? []
    for (const ref of refList) {
      // Astronomy Engine sanity check is scoped to the 9 non-Moon non-Node bodies.
      if (source === 'astronomyEngine' && !SYSTEMIC_RULE_BODIES.includes(ref.body)) {
        continue
      }

      const celestia = celestiaByBody.get(ref.body)
      if (celestia === undefined) continue

      const delta = longitudeDeltaArcsec(celestia, ref.longitude)
      const threshold =
        source === 'astronomyEngine'
          ? ASTRONOMY_ENGINE_THRESHOLD_ARCSEC
          : PRIMARY_THRESHOLDS_ARCSEC[ref.body]
      const status: Status =
        source === 'astronomyEngine'
          ? delta <= threshold
            ? 'pass'
            : 'queue'
          : classifyBodyStatus(ref.body, delta)

      out.push({
        body: ref.body,
        celestiaLongitude: celestia,
        referenceLongitude: ref.longitude,
        referenceSource: source,
        deltaArcsec: delta,
        threshold,
        status,
      })
    }
  }
  return out
}

function computeCaseJd(testCase: TestCase): number {
  const date = new Date(`${testCase.birthDate}T00:00:00Z`)
  const time = testCase.birthTime ?? '12:00'
  const { utcHours, dayOffset } = localTimeToUTC(date, time, testCase.lat, testCase.lon)
  return getJulianDayUTC(date, utcHours, dayOffset)
}

function compareHouses(
  chart: ChartData,
  testCase: TestCase,
  references: ReferenceData,
): HouseCuspComparison[] {
  const out: HouseCuspComparison[] = []

  // §9.3 Tier 3 — inline Placidus reference is always computed, per case.
  const jd = computeCaseJd(testCase)
  const placidus = computePlacidusCusps(jd, testCase.lat, testCase.lon)
  const inlineRef = {
    cusps: placidus.cusps,
    ascendant: placidus.ascendant,
    mc: placidus.mc,
  }
  const allSources: Array<{ source: ReferenceSource; ref: typeof inlineRef }> = [
    { source: 'inlinePlacidus', ref: inlineRef },
  ]
  const externalSources = Object.keys(references.houses ?? {}) as ReferenceSource[]
  for (const source of externalSources) {
    const ref = references.houses?.[source]
    if (ref) allSources.push({ source, ref })
  }

  for (const { source, ref } of allSources) {

    out.push({
      cuspIndex: 0,
      label: 'ASC',
      celestia: chart.ascendant.longitude,
      reference: ref.ascendant,
      referenceSource: source,
      deltaArcsec: longitudeDeltaArcsec(chart.ascendant.longitude, ref.ascendant),
      threshold: HOUSE_THRESHOLD_ARCSEC,
      status:
        longitudeDeltaArcsec(chart.ascendant.longitude, ref.ascendant) <=
        HOUSE_THRESHOLD_ARCSEC
          ? 'pass'
          : 'queue',
    })
    out.push({
      cuspIndex: -1,
      label: 'MC',
      celestia: chart.mc.longitude,
      reference: ref.mc,
      referenceSource: source,
      deltaArcsec: longitudeDeltaArcsec(chart.mc.longitude, ref.mc),
      threshold: HOUSE_THRESHOLD_ARCSEC,
      status:
        longitudeDeltaArcsec(chart.mc.longitude, ref.mc) <= HOUSE_THRESHOLD_ARCSEC
          ? 'pass'
          : 'queue',
    })
    // Intermediate Placidus cusps (2, 3, 5, 6, 8, 9, 11, 12) are undefined at
    // polar-circle latitudes where |tan φ · tan D| ≥ 1. Fixtures for those
    // cases set `skipIntermediateCusps: true` so the inline-reference NaN
    // doesn't masquerade as a queue-worthy delta. ASC, MC, and the quadrant
    // cusps (1 = ASC, 4 = IC, 7 = DSC, 10 = MC) still validate normally.
    const intermediateCuspIndexes = new Set([1, 2, 4, 5, 7, 8, 10, 11]) // 0-based
    for (let i = 0; i < 12; i++) {
      const celestiaCusp = chart.houses[i]?.cuspLongitude
      const refCusp = ref.cusps[i]
      if (celestiaCusp === undefined || refCusp === undefined) continue
      if (
        testCase.skipIntermediateCusps &&
        intermediateCuspIndexes.has(i)
      ) {
        continue
      }
      const delta = longitudeDeltaArcsec(celestiaCusp, refCusp)
      out.push({
        cuspIndex: i + 1,
        label: `Cusp ${i + 1}`,
        celestia: celestiaCusp,
        reference: refCusp,
        referenceSource: source,
        deltaArcsec: delta,
        threshold: HOUSE_THRESHOLD_ARCSEC,
        status: delta <= HOUSE_THRESHOLD_ARCSEC ? 'pass' : 'queue',
      })
    }
  }
  return out
}

function aspectKey(body1: Body, body2: Body): string {
  return [body1, body2].sort().join('~')
}

function compareAspects(
  chart: ChartData,
  references: ReferenceData,
): AspectComparison[] {
  const out: AspectComparison[] = []
  const sources = Object.keys(references.aspects ?? {}) as ReferenceSource[]

  for (const source of sources) {
    const refAspects = references.aspects?.[source] ?? []
    const refByKey = new Map<string, (typeof refAspects)[number]>()
    for (const ref of refAspects) {
      refByKey.set(aspectKey(ref.body1, ref.body2), ref)
    }

    const celestiaByKey = new Map<string, AspectData>()
    for (const a of chart.aspects) {
      celestiaByKey.set(aspectKey(a.planet1 as Body, a.planet2 as Body), a)
    }

    const allKeys = new Set<string>([
      ...celestiaByKey.keys(),
      ...refByKey.keys(),
    ])
    for (const key of allKeys) {
      const celestia = celestiaByKey.get(key)
      const reference = refByKey.get(key)
      const [b1, b2] = key.split('~') as [Body, Body]

      const typeMatch =
        celestia !== undefined &&
        reference !== undefined &&
        celestia.aspect === reference.type
      const applyingMatch =
        celestia !== undefined &&
        reference !== undefined &&
        celestia.applying === reference.applying

      let orbDeltaArcsec: number | undefined
      if (celestia && reference) {
        orbDeltaArcsec = Math.abs(celestia.orb - reference.orb) * 3600
      }

      let status: Status = 'pass'
      if (!celestia || !reference) {
        status = 'queue' // asymmetric detection — flag for review, not halt
      } else if (!typeMatch) {
        status = 'pause-and-fix' // wrong aspect type = real error
      } else if (!applyingMatch) {
        status = 'queue' // applying/separating can flip near-exact; surface for review
      } else if (orbDeltaArcsec !== undefined && orbDeltaArcsec > ASPECT_ORB_THRESHOLD_ARCSEC) {
        status = 'queue'
      }

      out.push({
        body1: b1,
        body2: b2,
        celestiaType: celestia?.aspect,
        referenceType: reference?.type,
        celestiaOrb: celestia?.orb,
        referenceOrb: reference?.orb,
        celestiaApplying: celestia?.applying,
        referenceApplying: reference?.applying,
        typeMatch: celestia !== undefined && reference !== undefined && typeMatch,
        applyingMatch:
          celestia !== undefined && reference !== undefined && applyingMatch,
        orbDeltaArcsec,
        status,
      })
    }
  }
  return out
}

export function runCaseComparison(
  testCase: TestCase,
  references: ReferenceData,
): CaseComparisonResult {
  const chart = calculateNatalChart(buildChartInput(testCase))

  const planetComparisons = comparePlanets(chart, testCase, references)
  const houseComparisons = compareHouses(chart, testCase, references)
  const aspectComparisons = compareAspects(chart, references)

  // Primary (JPL) planet batch status: composite rule over 9 planets.
  const jplPlanetDeltas = planetComparisons
    .filter((c) => c.referenceSource === 'jpl')
    .map((c) => ({ body: c.body, deltaArcsec: c.deltaArcsec }))
  const planetBatchStatus = classifyPlanetBatch(jplPlanetDeltas)

  // Moon and Node classify independently via their primary (JPL) comparisons.
  const moonJpl = planetComparisons.find(
    (c) => c.body === 'moon' && c.referenceSource === 'jpl',
  )
  const nodeJpl = planetComparisons.find(
    (c) => c.body === 'northNode' && c.referenceSource === 'jpl',
  )

  const secondaryAndHouseStatuses: Status[] = [
    ...planetComparisons
      .filter((c) => c.referenceSource !== 'jpl')
      .map((c) => c.status),
    ...houseComparisons.map((c) => c.status),
    ...aspectComparisons.map((c) => c.status),
  ]

  // Far-range [observation] cases: Tier 1 (JPL) threshold violations are
  // classified as observations per the user-approved §9.2 ruling, because the
  // observed deltas reflect inter-ephemeris-generation divergence (DE404 vs
  // DE441) at far-T rather than a bug in sweph's Moshier code. The per-body
  // rows still show their raw mechanical statuses in the report tables — only
  // the case-level overallStatus is demoted. See lessons-learned section in
  // 09-02-LONGITUDE-REPORT.md on branching-rule meta-finding.
  const tier1Statuses: Status[] = testCase.farRangeObservation
    ? []
    : [
        planetBatchStatus,
        moonJpl?.status ?? 'pass',
        nodeJpl?.status ?? 'pass',
      ]
  const overallStatus = mostSevere([
    ...tier1Statuses,
    ...secondaryAndHouseStatuses,
  ])

  return {
    testCase,
    planetComparisons,
    houseComparisons,
    aspectComparisons,
    overallStatus,
  }
}
