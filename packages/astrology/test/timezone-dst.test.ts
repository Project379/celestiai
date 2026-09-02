/**
 * DST-boundary correctness for localTimeToUTC (Astrology Phase 2, Finding 1).
 *
 * The old getUTCOffsetMinutes built its probe instant from the wall-clock
 * time as though it were already UTC, so it sampled the zone offset 2-3
 * hours away from the true birth instant. Within ~1h of a DST transition it
 * read the wrong side and produced a UTC timestamp one hour off — enough to
 * move the Ascendant ~15deg.
 *
 * These cases were confirmed RED against the pre-fix implementation
 * (Astrology Phase 1 diagnosis, section 1B-c):
 *   - 2001-03-25 01:30 Sofia  -> pre-fix returned 2001-03-24 22:30Z (1h early)
 *   - 1985-03-31 02:30 Sofia  -> pre-fix returned 1985-03-30 23:30Z (spring gap)
 *   - 2001-10-28 03:30 Sofia  -> pre-fix returned 01:30Z (later occurrence,
 *                                 wrong convention, no ambiguity flag)
 * The four non-boundary cases were already correct and are kept as
 * regression guards.
 */
import { describe, expect, it } from 'vitest'
import { localTimeToUTC } from '../src/utils/timezone'

const SOFIA_LAT = 42.6977
const SOFIA_LON = 23.3219
const PLOVDIV_LAT = 42.1354
const PLOVDIV_LON = 24.7453
const VARNA_LAT = 43.2141
const VARNA_LON = 27.9147

/** Reconstruct the absolute UTC instant localTimeToUTC decided on. */
function resultToISO(
  baseDateUTC: Date,
  r: { utcHours: number; dayOffset: number },
): string {
  const ms =
    Date.UTC(
      baseDateUTC.getUTCFullYear(),
      baseDateUTC.getUTCMonth(),
      baseDateUTC.getUTCDate() + r.dayOffset,
    ) + Math.round(r.utcHours * 3_600_000)
  return new Date(ms).toISOString()
}

describe('localTimeToUTC — non-boundary Bulgarian cases (regression guards)', () => {
  const cases: Array<{
    label: string
    date: string
    time: string
    lat: number
    lon: number
    expectISO: string
  }> = [
    {
      label: '1990-06-15 14:30 Sofia (EEST, UTC+3)',
      date: '1990-06-15',
      time: '14:30',
      lat: SOFIA_LAT,
      lon: SOFIA_LON,
      expectISO: '1990-06-15T11:30:00.000Z',
    },
    {
      label: '1985-07-20 03:45 Plovdiv (EEST, UTC+3)',
      date: '1985-07-20',
      time: '03:45',
      lat: PLOVDIV_LAT,
      lon: PLOVDIV_LON,
      expectISO: '1985-07-20T00:45:00.000Z',
    },
    {
      label: '1975-01-10 22:15 Varna (EET, UTC+2, pre-DST era)',
      date: '1975-01-10',
      time: '22:15',
      lat: VARNA_LAT,
      lon: VARNA_LON,
      expectISO: '1975-01-10T20:15:00.000Z',
    },
    {
      label: '2001-11-03 09:00 Sofia (EET, UTC+2, winter)',
      date: '2001-11-03',
      time: '09:00',
      lat: SOFIA_LAT,
      lon: SOFIA_LON,
      expectISO: '2001-11-03T07:00:00.000Z',
    },
  ]

  for (const c of cases) {
    it(c.label, () => {
      const base = new Date(`${c.date}T00:00:00Z`)
      const r = localTimeToUTC(base, c.time, c.lat, c.lon)
      expect(resultToISO(base, r)).toBe(c.expectISO)
      expect(r.ambiguous ?? false).toBe(false)
      expect(r.nonexistent ?? false).toBe(false)
    })
  }
})

describe('localTimeToUTC — DST transition boundaries (Europe/Sofia)', () => {
  it('2001-03-25 01:30 Sofia — 30 min before spring-forward, still EET (UTC+2)', () => {
    // EU spring-forward 2001 fires at 01:00 UTC (03:00 local -> 04:00). A
    // 01:30 local birth is unambiguously pre-transition: 01:30 - 2:00.
    const base = new Date('2001-03-25T00:00:00Z')
    const r = localTimeToUTC(base, '01:30', SOFIA_LAT, SOFIA_LON)
    expect(resultToISO(base, r)).toBe('2001-03-24T23:30:00.000Z')
    expect(r.ambiguous ?? false).toBe(false)
    expect(r.nonexistent ?? false).toBe(false)
  })

  it('2001-03-25 02:30 Sofia — the last existing minute before the spring-forward gap', () => {
    // EU spring-forward fires at 01:00 UTC: local 02:59 (EET) -> 04:00
    // (EEST). 02:30 local still exists and is unambiguous EET (+2).
    const base = new Date('2001-03-25T00:00:00Z')
    const r = localTimeToUTC(base, '02:30', SOFIA_LAT, SOFIA_LON)
    expect(resultToISO(base, r)).toBe('2001-03-25T00:30:00.000Z')
    expect(r.ambiguous ?? false).toBe(false)
    expect(r.nonexistent ?? false).toBe(false)
  })

  it('2001-03-25 03:30 Sofia — inside the spring-forward gap (nonexistent local time)', () => {
    // Local 03:00-04:00 does not exist on this date. Convention: shift the
    // wall time forward across the gap (post-transition standard offset,
    // +2 -> the later candidate instant), and flag it.
    const base = new Date('2001-03-25T00:00:00Z')
    const r = localTimeToUTC(base, '03:30', SOFIA_LAT, SOFIA_LON)
    expect(resultToISO(base, r)).toBe('2001-03-25T01:30:00.000Z')
    expect(r.nonexistent).toBe(true)
  })

  it('1985-03-31 02:30 Sofia — spring-forward gap on the pre-EU Bulgarian schedule', () => {
    // tzdata Europe/Sofia: 1985 spring-forward at 1985-03-31T00:00:00Z
    // (02:00 local std -> 03:00 local DST). 02:30 local is in the gap.
    const base = new Date('1985-03-31T00:00:00Z')
    const r = localTimeToUTC(base, '02:30', SOFIA_LAT, SOFIA_LON)
    expect(resultToISO(base, r)).toBe('1985-03-31T00:30:00.000Z')
    expect(r.nonexistent).toBe(true)
  })

  it('2001-10-28 03:30 Sofia — inside the autumn fall-back repeated hour (ambiguous)', () => {
    // EU fall-back 2001 fires at 01:00 UTC (04:00 local EEST -> 03:00 local
    // EET), so local 03:00-04:00 occurs twice. Convention: the EARLIER
    // occurrence (still DST, UTC+3) -> 03:30 - 3:00 = 00:30Z, flagged.
    const base = new Date('2001-10-28T00:00:00Z')
    const r = localTimeToUTC(base, '03:30', SOFIA_LAT, SOFIA_LON)
    expect(resultToISO(base, r)).toBe('2001-10-28T00:30:00.000Z')
    expect(r.ambiguous).toBe(true)
  })

  it('2001-10-28 05:00 Sofia — after fall-back, unambiguous EET (UTC+2)', () => {
    const base = new Date('2001-10-28T00:00:00Z')
    const r = localTimeToUTC(base, '05:00', SOFIA_LAT, SOFIA_LON)
    expect(resultToISO(base, r)).toBe('2001-10-28T03:00:00.000Z')
    expect(r.ambiguous ?? false).toBe(false)
    expect(r.nonexistent ?? false).toBe(false)
  })
})
