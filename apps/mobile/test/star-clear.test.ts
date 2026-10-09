import { describe, expect, it } from 'vitest'

import { starIsClear, STAR_CLEAR_PX } from '@/lib/starClear'

describe('starfield clear zones', () => {
  const word = { x: 100, y: 200, w: 80, h: 20 }

  it('rejects a star inside the clear distance on every side', () => {
    expect(STAR_CLEAR_PX).toBe(14)
    expect(starIsClear(140, 195, 1, [word])).toBe(false) // above, 5px
    expect(starIsClear(140, 225, 1, [word])).toBe(false) // below, 5px
    expect(starIsClear(95, 210, 1, [word])).toBe(false) // left, 5px
    expect(starIsClear(185, 210, 1, [word])).toBe(false) // right, 5px
    expect(starIsClear(140, 210, 1, [word])).toBe(false) // on the word
  })

  it('keeps a star that is at least 14px (plus its own radius) away', () => {
    expect(starIsClear(140, 180, 1, [word])).toBe(true) // 20px above
    expect(starIsClear(140, 240, 1, [word])).toBe(true) // 20px below
    expect(starIsClear(70, 210, 1, [word])).toBe(true) // 30px left
  })

  it('counts the star radius: a big star at 14px is too close, a small one is not', () => {
    expect(starIsClear(140, 200 - 14, 1.9, [word])).toBe(false)
    expect(starIsClear(140, 200 - 16, 1.0, [word])).toBe(true)
  })

  it('no zones means every star stays', () => {
    expect(starIsClear(10, 10, 2, [])).toBe(true)
  })
})
