// Pure formatting for the Днес v2 screen. No React, so it is unit-testable.
// All Bulgarian here is founder-approved (2026-10-09, see the strings table).

import { isNewFormatHoroscope } from '@stellaeum/core/dnes/text-fit'

import { DNES_COPY } from './copy'

const WEEKDAYS = ['неделя', 'понеделник', 'вторник', 'сряда', 'четвъртък', 'петък', 'събота'] as const
const MONTHS_SHORT = ['ян.', 'февр.', 'март', 'апр.', 'май', 'юни', 'юли', 'авг.', 'септ.', 'окт.', 'ноем.', 'дек.'] as const
const MONTHS_LONG = [
  'януари', 'февруари', 'март', 'април', 'май', 'юни',
  'юли', 'август', 'септември', 'октомври', 'ноември', 'декември',
] as const

interface SofiaParts {
  year: number
  month: number // 1-12
  day: number
  weekday: number // 0 = Sunday
}

/** Calendar date in Europe/Sofia, regardless of the device zone. */
export function sofiaParts(now: Date): SofiaParts {
  const f = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Sofia', year: 'numeric', month: '2-digit', day: '2-digit' })
  const [y, m, d] = f.format(now).split('-').map(Number) as [number, number, number]
  return { year: y, month: m, day: d, weekday: new Date(Date.UTC(y, m - 1, d)).getUTCDay() }
}

/** «сряда, 7 окт.» */
export function formatDnesDate(now: Date): string {
  const p = sofiaParts(now)
  return `${WEEKDAYS[p.weekday]}, ${p.day} ${MONTHS_SHORT[p.month - 1]}`
}

/** «октомври» */
export function monthNameBg(now: Date): string {
  return MONTHS_LONG[sofiaParts(now).month - 1]!
}

/** «YYYY-MM» in Europe/Sofia, the key of the monthly sign text. */
export function sofiaYearMonth(now: Date): string {
  const p = sofiaParts(now)
  return `${p.year}-${String(p.month).padStart(2, '0')}`
}

/**
 * First name only, first letter capitalised. null when there is no usable name,
 * so the caller can fall back to a greeting without one.
 */
export function firstNameOf(raw: string | null | undefined): string | null {
  const first = (raw ?? '').trim().split(/\s+/)[0] ?? ''
  if (!first) return null
  return first.charAt(0).toLocaleUpperCase('bg-BG') + first.slice(1)
}

/** «Добър вечер, Николай.» (or «Добър вечер.» without a name) */
export function greetingLine(phrase: string, name: string | null): string {
  return name ? `${phrase}, ${name}.` : `${phrase}.`
}

/** «Растяща · 96% осветена» */
export function moonHeadline(isWaxing: boolean, illumination: number): string {
  return `${isWaxing ? DNES_COPY.moonWaxing : DNES_COPY.moonWaning} · ${Math.round(illumination)}% ${DNES_COPY.illuminated}`
}

function sofiaDayNumber(d: Date): number {
  const p = sofiaParts(d)
  return Math.round(Date.UTC(p.year, p.month - 1, p.day) / 86_400_000)
}

/**
 * «Пълнолуние след 2 дни», «Пълнолуние утре», «Пълнолуние днес».
 * Counted in Sofia calendar days, not 24-hour blocks, so "утре" means tomorrow.
 */
export function nextMajorLine(name: string, daysAway: number, now: Date): string {
  const event = new Date(now.getTime() + daysAway * 86_400_000)
  const n = Math.max(0, sofiaDayNumber(event) - sofiaDayNumber(now))
  const label = name.charAt(0).toLocaleUpperCase('bg-BG') + name.slice(1)
  if (n === 0) return `${label} ${DNES_COPY.today}`
  if (n === 1) return `${label} ${DNES_COPY.tomorrow}`
  return `${label} ${DNES_COPY.inDays} ${n} ${DNES_COPY.days}`
}

export interface HoroscopeParts {
  sky: string
  feel: string
  advice: string
}

function stripSentinels(text: string): string {
  return text
    .replace(/\[\/?planet(?::[a-zA-Z]+)?\]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

/**
 * Splits stored horoscope content into the three levels. Nothing is ever shortened: a part
 * that is longer than the v2 limit is shown whole (the levels area scrolls). `legacy` is
 * true when the row is not in the v2 shape (old long paragraphs, or digits), which is what
 * asks the server to upgrade it once. Returns null when there are not three paragraphs.
 */
export function splitHoroscope(content: string): { parts: HoroscopeParts; legacy: boolean } | null {
  const paras = content
    .split(/\n\s*\n/)
    .map(stripSentinels)
    .filter(Boolean)
  if (paras.length !== 3) return null
  return {
    parts: { sky: paras[0]!, feel: paras[1]!, advice: paras[2]! },
    legacy: !isNewFormatHoroscope(content),
  }
}
