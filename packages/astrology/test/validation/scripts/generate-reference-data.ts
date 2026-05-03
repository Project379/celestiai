/**
 * §9.2 reference-data generator — one-shot script.
 *
 * Iterates every fixture under `../fixtures/`, skips any case whose
 * `../reference-data/{id}.ts` already exists, derives UTC from Celestia's
 * own pipeline (`localTimeToUTC` + `getJulianDayUTC` equivalent), queries
 * JPL Horizons for 10 bodies, computes Astronomy Engine locally for 9
 * non-Moon non-Node bodies, writes a committed `.ts` snapshot.
 *
 * Historical-tz protocol (reference-data/README.md §9.1.1): the generator
 * uses the UTC that Celestia's `localTimeToUTC` produces, not the astro-
 * community's LMT-corrected UTC. This makes Einstein/Kahlo cases self-
 * consistency checks rather than LMT-reference checks.
 *
 * AE out-of-range handling: AE's VSOP87 and Pluto polynomial narrow
 * toward the 1600 / 2200 edges. If AE throws for a body, the generator
 * skips that body and logs a warning; the emitted snapshot simply omits
 * the missing bodies under `planets.astronomyEngine`.
 *
 * Run: `pnpm --filter @stellaeum/astrology exec tsx test/validation/scripts/generate-reference-data.ts`
 */

import { existsSync, readdirSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

import { localTimeToUTC } from '../../../src/utils/timezone'
import { computeAstronomyEngineLongitudes } from '../adapters/astronomy-engine'
import { buildHorizonsUrl, parseHorizonsLongitude } from '../adapters/jpl-horizons'
import type { Body, PlanetReference, TestCase } from '../types'

const thisDir = dirname(fileURLToPath(import.meta.url))
const fixturesDir = join(thisDir, '..', 'fixtures')
const referenceDir = join(thisDir, '..', 'reference-data')

const JPL_BODIES: Array<Exclude<Body, 'northNode'>> = [
  'sun',
  'moon',
  'mercury',
  'venus',
  'mars',
  'jupiter',
  'saturn',
  'uranus',
  'neptune',
  'pluto',
]

const AE_BODIES: Array<Exclude<Body, 'moon' | 'northNode'>> = [
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

function caseUtcInstant(testCase: TestCase): Date {
  const date = new Date(`${testCase.birthDate}T00:00:00Z`)
  const time = testCase.birthTime ?? '12:00'
  const { utcHours, dayOffset } = localTimeToUTC(
    date,
    time,
    testCase.lat,
    testCase.lon,
  )
  const hoursInt = Math.floor(utcHours)
  const minuteFloat = (utcHours - hoursInt) * 60
  const minutesInt = Math.floor(minuteFloat)
  const secondsFloat = (minuteFloat - minutesInt) * 60
  const secondsInt = Math.round(secondsFloat)
  return new Date(
    Date.UTC(
      date.getUTCFullYear(),
      date.getUTCMonth(),
      date.getUTCDate() + dayOffset,
      hoursInt,
      minutesInt,
      secondsInt,
    ),
  )
}

function formatUtcForHeader(utc: Date): string {
  return utc.toISOString().replace('T', ' ').slice(0, 19)
}

function formatReferenceFile(params: {
  caseId: string
  caseName: string
  birthDate: string
  birthTime: string | undefined
  utc: Date
  jpl: PlanetReference[]
  ae: PlanetReference[]
  aeNote?: string
}): string {
  const { caseId, caseName, birthDate, birthTime, utc, jpl, ae, aeNote } = params
  const utcStr = formatUtcForHeader(utc)
  const lines: string[] = []
  lines.push('/**')
  lines.push(` * ${caseName} — reference data snapshot (§9.2 generator).`)
  lines.push(' *')
  lines.push(` * Case: see ../fixtures/${caseId}.ts`)
  lines.push(
    ` * Fixture → UTC: ${birthDate}${birthTime ? ` ${birthTime}` : ''} local → ${utcStr} UTC.`,
  )
  lines.push(
    ' *   UTC derived via Celestia\'s `localTimeToUTC` so reference-data query instant',
  )
  lines.push(
    ' *   matches what the harness feeds `sweph.calc_ut`. Historical-tz cases (Einstein,',
  )
  lines.push(
    ' *   Kahlo, year-1600) are self-consistency checks under Celestia\'s zone interpretation;',
  )
  lines.push(' *   see reference-data/README.md §9.1.1.')
  lines.push(' *')
  lines.push(
    ' * Generated: ' +
      new Date().toISOString().slice(0, 10) +
      ' by test/validation/scripts/generate-reference-data.ts.',
  )
  lines.push(' *')
  lines.push(' * JPL Horizons protocol: apparent geocentric ecliptic longitudes,')
  lines.push(
    " *   CENTER='500@399', QUANTITIES='31'. Matches sweph.calc_ut convention under",
  )
  lines.push(' *   SEFLG_MOSEPH (light-time, gravitational deflection, stellar aberration).')
  lines.push(' *')
  lines.push(
    ' * Astronomy Engine protocol: local `astronomy-engine` npm package, `GeoVector`',
  )
  lines.push(
    " *   with aberration=true, `Ecliptic` conversion. Scope: 9 non-Moon non-Node bodies.",
  )
  if (aeNote) {
    lines.push(` *   Note: ${aeNote}`)
  }
  lines.push(' *')
  lines.push(' * Mean Node — inline-reference asymmetry:')
  lines.push(
    ' *   northNode intentionally omitted from planets.jpl. Node reference is the',
  )
  lines.push(' *   inline Meeus Ch. 47 polynomial in `adapters/node-meeus.ts`.')
  lines.push(' */')
  lines.push('')
  lines.push("import type { ReferenceData } from '../types'")
  lines.push('')
  lines.push('export const referenceData: ReferenceData = {')
  lines.push(`  caseId: '${caseId}',`)
  lines.push('  planets: {')
  lines.push('    jpl: [')
  for (const p of jpl) {
    lines.push(`      { body: '${p.body}', longitude: ${p.longitude.toFixed(7)} },`)
  }
  lines.push('    ],')
  if (ae.length > 0) {
    lines.push('    astronomyEngine: [')
    for (const p of ae) {
      lines.push(`      { body: '${p.body}', longitude: ${p.longitude.toFixed(7)} },`)
    }
    lines.push('    ],')
  }
  lines.push('  },')
  lines.push('}')
  lines.push('')
  return lines.join('\n')
}

async function main(): Promise<void> {
  const fixtureFiles = readdirSync(fixturesDir).filter(
    (f) => f.endsWith('.ts') && !f.endsWith('.d.ts'),
  )
  const existing = new Set(
    readdirSync(referenceDir).filter(
      (f) => f.endsWith('.ts') && !f.endsWith('.d.ts'),
    ),
  )

  console.log(
    `[gen] ${fixtureFiles.length} fixture(s) scanned, ${existing.size} existing reference-data file(s).`,
  )

  for (const file of fixtureFiles) {
    const mod = (await import(pathToFileURL(join(fixturesDir, file)).href)) as { testCase?: TestCase }
    if (!mod.testCase) {
      console.warn(`[gen] ${file}: no testCase export — skipping`)
      continue
    }
    const testCase = mod.testCase
    const outFile = `${testCase.id}.ts`
    if (existing.has(outFile)) {
      console.log(`[gen] ${testCase.id}: reference-data exists, skipping`)
      continue
    }
    console.log(`[gen] ${testCase.id}: generating…`)

    const utc = caseUtcInstant(testCase)
    console.log(`[gen] ${testCase.id}: UTC instant ${formatUtcForHeader(utc)}`)

    // JPL — sequential per body with per-body soft-fail. JPL Horizons DE441 has
    // body-specific date coverage (Saturn pre-1749, Pluto pre-1800/post-2199,
    // Jupiter post-2200-01). Out-of-coverage responses carry "No ephemeris"
    // text instead of a $$SOE block — treat as a skip, not a fatal. Other
    // parse failures still throw.
    const jpl: PlanetReference[] = []
    const jplSkipped: string[] = []
    for (const body of JPL_BODIES) {
      const url = buildHorizonsUrl(body, utc)
      const res = await fetch(url)
      if (!res.ok) {
        throw new Error(
          `Horizons ${body} HTTP failure: ${res.status} ${res.statusText}`,
        )
      }
      const text = await res.text()
      const longitude = parseHorizonsLongitude(text)
      if (longitude !== null) {
        jpl.push({ body, longitude })
        continue
      }
      if (/No ephemeris for target/i.test(text)) {
        jplSkipped.push(body)
        console.warn(
          `[gen] ${testCase.id}: JPL ${body} out of coverage — skipped`,
        )
        continue
      }
      throw new Error(`Horizons ${body} parse failed — no $$SOE and no coverage message`)
    }
    console.log(
      `[gen] ${testCase.id}: JPL ${jpl.length}/${JPL_BODIES.length} bodies fetched${jplSkipped.length > 0 ? ` (skipped: ${jplSkipped.join(', ')})` : ''}`,
    )

    // Astronomy Engine — pure-local, may throw for out-of-range dates.
    const ae: PlanetReference[] = []
    const aeSkipped: string[] = []
    for (const body of AE_BODIES) {
      try {
        const [result] = computeAstronomyEngineLongitudes(utc, [body])
        if (result && Number.isFinite(result.longitude)) {
          ae.push(result)
        } else {
          aeSkipped.push(body)
        }
      } catch (err) {
        aeSkipped.push(body)
        console.warn(`[gen] ${testCase.id}: AE ${body} threw — ${(err as Error).message}`)
      }
    }
    const notes: string[] = []
    if (jplSkipped.length > 0) {
      notes.push(
        `JPL out of coverage for ${jplSkipped.join(', ')} at this date; per-body soft-skip applied. Those bodies validate via Astronomy Engine only (60″ threshold, Tier-secondary).`,
      )
    }
    if (aeSkipped.length > 0) {
      notes.push(
        `AE skipped for ${aeSkipped.join(', ')} (out-of-range or non-finite). Omitted from snapshot.`,
      )
    }
    const aeNote = notes.length > 0 ? notes.join(' ') : undefined
    console.log(
      `[gen] ${testCase.id}: AE ${ae.length}/${AE_BODIES.length} bodies computed${aeSkipped.length > 0 ? ` (skipped: ${aeSkipped.join(', ')})` : ''}`,
    )

    const content = formatReferenceFile({
      caseId: testCase.id,
      caseName: testCase.name,
      birthDate: testCase.birthDate,
      birthTime: testCase.birthTime,
      utc,
      jpl,
      ae,
      aeNote,
    })
    const outPath = join(referenceDir, outFile)
    writeFileSync(outPath, content)
    console.log(`[gen] ${testCase.id}: wrote ${outPath}`)
  }
}

main().catch((err) => {
  console.error('[gen] FATAL', err)
  process.exit(1)
})
