import { describe, expect, it } from 'vitest'
import {
  chartVersionChanged,
  clearAllHoroscopeEntries,
  clearHoroscopeEntriesForChart,
  horoscopeStorageKey,
  shouldCheckVersion,
  sweepStaleHoroscopeEntries,
  VERSION_CHECK_MIN_INTERVAL_MS,
  type KeyValueStorage,
} from '@/lib/birth-data/chart-version'

/**
 * Web side of birth-data edit invalidation (Batch 8 "b"): the chart's
 * birth_data_edited_at marker lives in every client cache key, so an edit —
 * here or on another device — makes pre-edit entries unreadable. These are the
 * pure parts; the React wiring (context, hooks, focus watcher) is typechecked
 * and built but not rendered in tests (the web suite is node-only, no DOM).
 */

function fakeStorage(initial: Record<string, string> = {}): KeyValueStorage & { keys(): string[] } {
  const map = new Map(Object.entries(initial))
  return {
    get length() {
      return map.size
    },
    key: (i) => [...map.keys()][i] ?? null,
    removeItem: (k) => void map.delete(k),
    keys: () => [...map.keys()].sort(),
  }
}

const OLD = '2026-09-01T00:00:00.000Z'
const NEW = '2026-10-01T10:00:00.000Z'

describe('horoscopeStorageKey', () => {
  it('includes the chart marker: the same chart and date gives a DIFFERENT key after an edit', () => {
    expect(horoscopeStorageKey('c1', OLD, '2026-10-01')).not.toBe(horoscopeStorageKey('c1', NEW, '2026-10-01'))
  })

  it('is stable for the same chart, marker and date, and keeps the daily-horoscope: prefix the sign-out sweep relies on', () => {
    const key = horoscopeStorageKey('c1', NEW, '2026-10-01')
    expect(key).toBe(horoscopeStorageKey('c1', NEW, '2026-10-01'))
    expect(key.startsWith('daily-horoscope:')).toBe(true)
  })
})

describe('sweepStaleHoroscopeEntries', () => {
  it('removes entries for this chart written under an older marker, and legacy marker-less keys; keeps the current marker and other charts', () => {
    const storage = fakeStorage({
      [horoscopeStorageKey('c1', OLD, '2026-09-30')]: 'x', // older marker -> removed
      [horoscopeStorageKey('c1', OLD, '2026-10-01')]: 'x', // older marker -> removed
      'daily-horoscope:c1:2026-10-01': 'x', // legacy key (pre-marker) -> removed
      [horoscopeStorageKey('c1', NEW, '2026-10-01')]: 'keep', // current -> kept
      [horoscopeStorageKey('c2', OLD, '2026-10-01')]: 'keep', // another chart -> untouched
      'unrelated-key': 'keep',
    })

    const removed = sweepStaleHoroscopeEntries(storage, 'c1', NEW)

    expect(removed).toBe(3)
    expect(storage.keys()).toEqual(
      [horoscopeStorageKey('c1', NEW, '2026-10-01'), horoscopeStorageKey('c2', OLD, '2026-10-01'), 'unrelated-key'].sort(),
    )
  })

  it('does not confuse a chart id that is a prefix of another (c1 vs c10)', () => {
    const storage = fakeStorage({ [horoscopeStorageKey('c10', OLD, '2026-10-01')]: 'keep' })

    expect(sweepStaleHoroscopeEntries(storage, 'c1', NEW)).toBe(0)
    expect(storage.keys()).toHaveLength(1)
  })
})

describe('clearHoroscopeEntriesForChart', () => {
  it('removes every entry for the chart whatever marker it was written under, and nothing else', () => {
    const storage = fakeStorage({
      [horoscopeStorageKey('c1', OLD, 'd1')]: 'x',
      [horoscopeStorageKey('c1', NEW, 'd2')]: 'x',
      [horoscopeStorageKey('c2', NEW, 'd1')]: 'keep',
    })

    expect(clearHoroscopeEntriesForChart(storage, 'c1')).toBe(2)
    expect(storage.keys()).toEqual([horoscopeStorageKey('c2', NEW, 'd1')])
  })
})

describe('clearAllHoroscopeEntries (sign-out)', () => {
  it('removes ALL daily-horoscope:* entries for every chart and marker, leaving unrelated keys alone', () => {
    const storage = fakeStorage({
      [horoscopeStorageKey('c1', OLD, 'd1')]: 'x',
      [horoscopeStorageKey('c2', NEW, 'd1')]: 'x',
      'daily-horoscope:legacy:2026-10-01': 'x',
      'some-other-app-key': 'keep',
    })

    expect(clearAllHoroscopeEntries(storage)).toBe(3)
    expect(storage.keys()).toEqual(['some-other-app-key'])
  })

  it('is a no-op on an empty storage', () => {
    expect(clearAllHoroscopeEntries(fakeStorage())).toBe(0)
  })
})

describe('chartVersionChanged (cross-device check on window focus)', () => {
  const same = { chartId: 'c1', editedAt: NEW }

  it('false when the marker is unchanged', () => {
    expect(chartVersionChanged(same, { chartId: 'c1', editedAt: NEW })).toBe(false)
  })

  it('false when the same instant is formatted differently (microseconds / offset), so a clean page does not refresh in a loop', () => {
    expect(
      chartVersionChanged(
        { chartId: 'c1', editedAt: '2026-10-01T10:00:00.000Z' },
        { chartId: 'c1', editedAt: '2026-10-01T10:00:00.000000+00:00' },
      ),
    ).toBe(false)
  })

  it('true when the marker moved (the chart was edited on another device)', () => {
    expect(chartVersionChanged(same, { chartId: 'c1', editedAt: '2026-10-01T11:00:00.000Z' })).toBe(true)
  })

  it('true when the active chart itself changed (a newer chart was created elsewhere)', () => {
    expect(chartVersionChanged(same, { chartId: 'c2', editedAt: NEW })).toBe(true)
  })

  it('true when a chart appeared or disappeared', () => {
    expect(chartVersionChanged({ chartId: null, editedAt: null }, same)).toBe(true)
    expect(chartVersionChanged(same, { chartId: null, editedAt: null })).toBe(true)
  })

  it('false when there is no chart on either side', () => {
    expect(chartVersionChanged({ chartId: null, editedAt: null }, { chartId: null, editedAt: null })).toBe(false)
  })
})

describe('shouldCheckVersion (throttle)', () => {
  it('allows a check once the minimum interval has elapsed, not before', () => {
    expect(shouldCheckVersion(0, VERSION_CHECK_MIN_INTERVAL_MS - 1)).toBe(false)
    expect(shouldCheckVersion(0, VERSION_CHECK_MIN_INTERVAL_MS)).toBe(true)
  })

  it('allows the very first check', () => {
    expect(shouldCheckVersion(0, Date.now())).toBe(true)
  })
})
