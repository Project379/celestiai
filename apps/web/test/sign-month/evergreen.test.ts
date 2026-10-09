import { describe, expect, it } from 'vitest'

import { ZODIAC_SIGNS_BG } from '@stellaeum/astrology/client'
import { rejectReason, SIGN_KEYS } from '@/lib/sign-month/generate'
import { SIGN_MONTH_EVERGREEN } from '@/lib/sign-month/evergreen'

describe('evergreen monthly texts', () => {
  it('has one per sign', () => {
    expect(Object.keys(SIGN_MONTH_EVERGREEN).sort()).toEqual([...SIGN_KEYS].sort())
  })

  for (const sign of SIGN_KEYS) {
    it(`${ZODIAC_SIGNS_BG[sign]} passes every rule a generated text must pass`, () => {
      // No sky-event stem (an evergreen text names no dated event), no other signs' openings.
      expect(rejectReason(SIGN_MONTH_EVERGREEN[sign], sign, [], [])).toBeNull()
    })
  }

  it('no two evergreen texts open the same way', () => {
    const opens = SIGN_KEYS.map((s) => SIGN_MONTH_EVERGREEN[s].split(/\s+/).slice(0, 3).join(' ').toLowerCase())
    expect(new Set(opens).size).toBe(12)
  })
})
