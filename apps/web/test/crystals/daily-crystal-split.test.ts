import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createMockSupabase, type MockSupabase } from '../mocks/supabase'

/**
 * Днес v2 split of crystal READING from COLLECTING.
 *
 *  - getCrystalOfTheDay(userId, { collect: false }) is a pure read: no insert into
 *    user_daily_crystals, and `collectedToday` reports whether today's row exists.
 *  - Default (legacy) reads still auto-collect, so the web dashboard and Кристали keep
 *    counting streaks until they are migrated.
 *  - collectDailyCrystal is the only write on the Днес path, idempotent per user per day.
 */

let mockSupabase: MockSupabase

vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => mockSupabase),
}))

import { collectDailyCrystal } from '@stellaeum/core/crystals/daily-collect'
import { getCrystalOfTheDay } from '@stellaeum/core/crystals/today'

const ALL_PHASES = [
  'new', 'waxing_crescent', 'first_quarter', 'waxing_gibbous',
  'full', 'waning_gibbous', 'last_quarter', 'waning_crescent',
]
const CATALOG_ROW = {
  id: 'crystal-1',
  slug: 'amethyst',
  name_en: 'Amethyst',
  name_bg: 'Аметист',
  tagline_en: 't',
  tagline_bg: 'спокойствие',
  description_en: 'd',
  description_bg: null,
  planet: null,
  zodiac_signs: [],
  moon_phases: ALL_PHASES,
  element: null,
  chakra: null,
  hardness: null,
  color_primary: '#a0f',
  color_secondary: '#70f',
  color_accent: null,
  svg_variant: 'raw',
  rarity: 'common',
  keywords: [],
  properties: null,
}

/** The app's day is the Europe/Sofia date, not the UTC date. */
const sofiaToday = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Sofia' }).format(new Date())

/** Every insert made into user_daily_crystals during the test. */
function dailyInserts() {
  const out: unknown[][] = []
  mockSupabase.from.mock.calls.forEach((call, i) => {
    if (call[0] !== 'user_daily_crystals') return
    const builder = mockSupabase.from.mock.results[i]!.value as { insert: ReturnType<typeof vi.fn> }
    out.push(...builder.insert.mock.calls)
  })
  return out
}

beforeEach(() => {
  vi.clearAllMocks()
  mockSupabase = createMockSupabase()
  process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co'
  process.env.SUPABASE_SECRET_KEY = 'test-service-key'
})

describe('getCrystalOfTheDay: collect option', () => {
  it('collect:false never writes, and reports collectedToday=false when there is no row', async () => {
    mockSupabase.push('crystals', { data: [CATALOG_ROW] })
    mockSupabase.push('users', { data: { subscription_tier: 'free' } })
    mockSupabase.push('user_daily_crystals', { data: [] })

    const r = await getCrystalOfTheDay('user_1', { collect: false })

    expect(dailyInserts()).toHaveLength(0)
    expect(r.collectedToday).toBe(false)
    expect(r.streak?.current).toBe(0)
  })

  it('collect:false reports collectedToday=true once today has a row, still without writing', async () => {
    mockSupabase.push('crystals', { data: [CATALOG_ROW] })
    mockSupabase.push('users', { data: { subscription_tier: 'premium' } })
    mockSupabase.push('user_daily_crystals', { data: [{ date: sofiaToday() }] })

    const r = await getCrystalOfTheDay('user_1', { collect: false })

    expect(dailyInserts()).toHaveLength(0)
    expect(r.collectedToday).toBe(true)
    expect(r.streak?.current).toBe(1)
  })

  it('the default read keeps the legacy auto-collect', async () => {
    mockSupabase.push('crystals', { data: [CATALOG_ROW] })
    mockSupabase.push('users', { data: { subscription_tier: 'free' } })
    mockSupabase.push('user_daily_crystals', { error: null }) // the insert
    mockSupabase.push('user_daily_crystals', { data: [{ date: sofiaToday() }] })

    const r = await getCrystalOfTheDay('user_1')

    expect(dailyInserts()).toHaveLength(1)
    expect(r.collectedToday).toBe(true)
  })

  it('an anonymous read never writes', async () => {
    mockSupabase.push('crystals', { data: [CATALOG_ROW] })
    const r = await getCrystalOfTheDay(null, { collect: false })
    expect(dailyInserts()).toHaveLength(0)
    expect(r.collectedToday).toBe(false)
  })
})

describe('collectDailyCrystal', () => {
  it('writes one row for today the first time (any tier) and says it was new', async () => {
    mockSupabase.push('crystals', { data: [CATALOG_ROW] })
    mockSupabase.push('users', { data: { subscription_tier: 'free' } })
    mockSupabase.push('user_daily_crystals', { data: [] }) // the read
    mockSupabase.push('user_daily_crystals', { error: null }) // the insert

    const r = await collectDailyCrystal('user_1')

    expect(dailyInserts()).toHaveLength(1)
    expect(dailyInserts()[0]![0]).toMatchObject({ user_id: 'user_1', crystal_id: 'crystal-1', date: sofiaToday() })
    expect(r.ok && r.data.alreadyCollected).toBe(false)
  })

  it('is idempotent: a unique-violation on the second tap reports alreadyCollected', async () => {
    mockSupabase.push('crystals', { data: [CATALOG_ROW] })
    mockSupabase.push('users', { data: { subscription_tier: 'free' } })
    mockSupabase.push('user_daily_crystals', { data: [{ date: sofiaToday() }] })
    mockSupabase.push('user_daily_crystals', { error: { code: '23505', message: 'duplicate key' } })

    const r = await collectDailyCrystal('user_1')

    expect(r.ok && r.data.alreadyCollected).toBe(true)
  })

  it('reports INTERNAL when the insert fails for any other reason', async () => {
    mockSupabase.push('crystals', { data: [CATALOG_ROW] })
    mockSupabase.push('users', { data: { subscription_tier: 'free' } })
    mockSupabase.push('user_daily_crystals', { data: [] })
    mockSupabase.push('user_daily_crystals', { error: { code: '42501', message: 'denied' } })

    const r = await collectDailyCrystal('user_1')

    expect(r).toEqual({ ok: false, error: 'INTERNAL' })
  })
})
