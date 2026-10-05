import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

/**
 * FF_BIRTH_DATA_EDIT gates the web ENTRY to birth-data edit (the «Ти» row).
 * Default OFF: unset or anything other than exactly 'true' hides it. Web and
 * mobile ship the edit together, so the entry stays off until mobile is ready.
 */

vi.mock('@clerk/nextjs/server', () => ({ auth: vi.fn(async () => ({ userId: 'user_flag_test' })) }))
const getCachedLatestChart = vi.hoisted(() => vi.fn(async () => ({ id: 'chart-1', name: 'x' })))
vi.mock('@/lib/supabase/queries', () => ({ getCachedLatestChart }))

import { isBirthDataEditEnabled } from '@/lib/config/featureFlags'
import { loadYouEntryChart } from '@/lib/birth-data/you-entry'

beforeEach(() => {
  vi.clearAllMocks()
})
afterEach(() => {
  vi.unstubAllEnvs()
})

describe('isBirthDataEditEnabled', () => {
  it('is OFF by default (flag unset)', () => {
    expect(isBirthDataEditEnabled()).toBe(false)
  })

  it.each(['false', '1', 'TRUE', 'yes', ''])('is OFF for %j — only the exact string "true" turns it on', (value) => {
    vi.stubEnv('FF_BIRTH_DATA_EDIT', value)
    expect(isBirthDataEditEnabled()).toBe(false)
  })

  it('is ON for exactly "true"', () => {
    vi.stubEnv('FF_BIRTH_DATA_EDIT', 'true')
    expect(isBirthDataEditEnabled()).toBe(true)
  })
})

describe('loadYouEntryChart (what the /you page passes to the hub)', () => {
  it('flag OFF: passes NO chart to the hub (so no edit row and no dialog render) and does not even query the chart', async () => {
    expect(await loadYouEntryChart()).toBeNull()
    expect(getCachedLatestChart).not.toHaveBeenCalled()
  })

  it('flag ON: passes the active chart so the hub renders the edit entry', async () => {
    vi.stubEnv('FF_BIRTH_DATA_EDIT', 'true')

    expect(await loadYouEntryChart()).toMatchObject({ id: 'chart-1' })
  })
})

describe('loadYouEntryChart — failure modes', () => {
  it('a DB failure yields null (the hub still renders without the entry), never a throw', async () => {
    vi.stubEnv('FF_BIRTH_DATA_EDIT', 'true')
    getCachedLatestChart.mockRejectedValueOnce(new Error('db down'))

    expect(await loadYouEntryChart()).toBeNull()
  })
})
