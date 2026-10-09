import { describe, expect, it } from 'vitest'

import {
  firstNameOf,
  formatDnesDate,
  greetingLine,
  monthNameBg,
  moonHeadline,
  nextMajorLine,
  splitHoroscope,
} from '@/lib/dnes/format'

const WED = new Date('2026-10-07T17:00:00Z') // 20:00 in Sofia, a Wednesday

describe('Днес v2 formatting', () => {
  it('formats the masthead date in Sofia time', () => {
    expect(formatDnesDate(WED)).toBe('сряда, 7 окт.')
    // 22:30 UTC on the 7th is already the 8th in Sofia
    expect(formatDnesDate(new Date('2026-10-07T22:30:00Z'))).toBe('четвъртък, 8 окт.')
    expect(monthNameBg(WED)).toBe('октомври')
  })

  it('uses the first name only, capitalised', () => {
    expect(firstNameOf('николай тонев')).toBe('Николай')
    expect(firstNameOf('  ана ')).toBe('Ана')
    expect(firstNameOf('')).toBeNull()
    expect(firstNameOf(undefined)).toBeNull()
    expect(greetingLine('Добър вечер', 'Николай')).toBe('Добър вечер, Николай.')
    expect(greetingLine('Добър вечер', null)).toBe('Добър вечер.')
  })

  it('writes the moon headline', () => {
    expect(moonHeadline(true, 96.2)).toBe('Растяща · 96% осветена')
    expect(moonHeadline(false, 40)).toBe('Намаляваща · 40% осветена')
  })

  it('counts days to the next major phase as днес / утре / след N дни', () => {
    expect(nextMajorLine('Пълнолуние', 0.05, WED)).toBe('Пълнолуние днес')
    expect(nextMajorLine('Пълнолуние', 0.15, WED)).toBe('Пълнолуние днес') // 20:00 + 3.6h = 23:36
    expect(nextMajorLine('Пълнолуние', 0.2, WED)).toBe('Пълнолуние утре') // 00:48 next day
    expect(nextMajorLine('Пълнолуние', 0.5, WED)).toBe('Пълнолуние утре')
    expect(nextMajorLine('Пълнолуние', 1.9, WED)).toBe('Пълнолуние след 2 дни')
    expect(nextMajorLine('новолуние', 5, WED)).toBe('Новолуние след 5 дни')
  })

  it('splits a 3-part horoscope and strips planet markers', () => {
    const r = splitHoroscope('[planet:mercury]Меркурий[/planet] носи общуване.\n\nЮпитер подкрепя Луната ти.\n\nГовори открито.')
    expect(r?.legacy).toBe(false)
    expect(r?.parts.sky).toBe('Меркурий носи общуване.')
    expect(r?.parts.advice).toBe('Говори открито.')
  })

  it('never shortens a long legacy paragraph, and marks the row legacy', () => {
    const long = (s: string) => s + ' ' + 'Още думи в същото изречение за дължина, '.repeat(4) + 'край.'
    const content = [long('Първо.'), long('Второ.'), long('Трето.')].join(String.fromCharCode(10, 10))
    const r = splitHoroscope(content)
    expect(r?.legacy).toBe(true)
    expect(r?.parts.sky).toBe(long('Първо.'))
    expect(r?.parts.advice.endsWith('край.')).toBe(true)
  })

  it('returns null unless there are exactly three paragraphs', () => {
    expect(splitHoroscope('Само едно.')).toBeNull()
    expect(splitHoroscope('Едно.\n\nДве.')).toBeNull()
  })
})
