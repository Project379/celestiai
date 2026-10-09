/**
 * Monthly sign text: sky facts, one generation, validation.
 * Server-only (native sweph via @stellaeum/astrology, Gemini via generateFinalText).
 */
import { ZODIAC_SIGNS_BG, type ZodiacSign } from '@stellaeum/astrology/client'
import { fitsMonthText } from '@stellaeum/core/dnes/text-fit'

import { ORACLE_FALLBACK_MODEL } from '@/lib/ai/client'
import { GEMINI_THINKING_LEVEL, generateFinalText } from '@/lib/ai/generate-final-text'
import { validateReading } from '@/lib/ai/validate-reading'
import { buildSignMonthSystemPrompt, buildSignMonthUserPrompt } from './prompt'

export const SIGN_KEYS = Object.keys(ZODIAC_SIGNS_BG) as ZodiacSign[]

const MONTHS_BG = [
  'януари', 'февруари', 'март', 'април', 'май', 'юни',
  'юли', 'август', 'септември', 'октомври', 'ноември', 'декември',
]

export function monthNameBg(ym: string): string {
  return MONTHS_BG[Number(ym.slice(5, 7)) - 1]!
}

export function isYearMonth(v: string): boolean {
  return /^\d{4}-(0[1-9]|1[0-2])$/.test(v)
}

/** Whole-sign houses: house 1 is the reader's own sign. Plain themes and concrete ideas. */
const HOUSE: { area: string; ideas: string[] }[] = [
  { area: 'yourself and a fresh start', ideas: ['change one habit that shows', 'say what you want for yourself out loud', 'update how you present yourself'] },
  { area: 'money and what you value', ideas: ['review your spending for one week', 'ask for what your work is worth', 'sell or give away something unused'] },
  { area: 'talking, learning and short trips', ideas: ['write the message you keep postponing', 'start a short course or book', 'visit a nearby place you have never seen'] },
  { area: 'home and family', ideas: ['call a relative you have not spoken to', 'fix one thing at home that annoys you', 'cook a meal for your family'] },
  { area: 'joy, creativity and romance', ideas: ['make something with your hands', 'plan a real date or a play evening', 'share a small creative piece with someone'] },
  { area: 'daily work and health routines', ideas: ['fix your sleep time', 'sort the one task you keep dodging', 'book the check-up you have delayed'] },
  { area: 'partners and close one-to-one bonds', ideas: ['tell a close person what you expect', 'ask a partner what they need', 'settle one old disagreement'] },
  { area: 'shared money, trust and deep change', ideas: ['talk about a shared debt or bill', 'let go of one thing you cling to', 'ask for help with something heavy'] },
  { area: 'beliefs, study and far horizons', ideas: ['plan a trip, even a small one', 'read something that disagrees with you', 'sign up for a class'] },
  { area: 'career and public life', ideas: ['show your boss one finished result', 'update your CV or portfolio', 'say yes to one visible task'] },
  { area: 'friends, groups and long-term hopes', ideas: ['message a friend you miss', 'join a group around a hope of yours', 'write down one goal for next year'] },
  { area: 'rest, solitude and endings', ideas: ['spend one evening alone without a screen', 'finish and close one old thing', 'walk alone somewhere quiet'] },
]

function houseOf(reader: ZodiacSign, target: string): number {
  const a = SIGN_KEYS.indexOf(reader)
  const b = SIGN_KEYS.indexOf(target as ZodiacSign)
  return ((b - a + 12) % 12) + 1
}

interface DayRow {
  sun: { sign: string; lon: number }
  moon: { sign: string; lon: number }
  mercuryRetro: boolean
}

interface SkyEvent {
  plain: string
  /** How to say it in plain Bulgarian, and the stems that prove the note says it. */
  say: string
  stems: string[]
  house: number
  score: number
}

/** Character of each sign, so two signs with the same event still get different advice. */
const SIGN_TRAIT: Record<ZodiacSign, string> = {
  aries: 'direct, quick, impatient',
  taurus: 'steady, practical, loves comfort',
  gemini: 'curious, talkative, restless',
  cancer: 'protective, emotional, home-loving',
  leo: 'proud, generous, loves to be seen',
  virgo: 'careful, helpful, detail-minded',
  libra: 'fair, peace-seeking, likes harmony',
  scorpio: 'intense, private, all-or-nothing',
  sagittarius: 'restless, honest, loves freedom',
  capricorn: 'disciplined, ambitious, patient',
  aquarius: 'independent, original, a little detached',
  pisces: 'dreamy, empathic, easily absorbed',
}

/** The month's real sky, computed with the same ephemeris the rest of the app uses. */
export async function buildSkyFacts(
  ym: string,
  sign: ZodiacSign,
): Promise<{ text: string; stems: string[] }> {
  const { calculateDailyTransits } = await import('@stellaeum/astrology')
  const year = Number(ym.slice(0, 4))
  const month = Number(ym.slice(5, 7))
  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate()

  const rows: DayRow[] = []
  for (let day = 1; day <= daysInMonth + 1; day++) {
    const t = calculateDailyTransits(new Date(Date.UTC(year, month - 1, day, 12)))
    const by = (p: string) => t.planets.find((x) => x.planet === p)!
    rows.push({
      sun: { sign: by('sun').sign, lon: by('sun').longitude },
      moon: { sign: by('moon').sign, lon: by('moon').longitude },
      mercuryRetro: by('mercury').speed < 0,
    })
  }
  const inMonth = rows.slice(0, daysInMonth)

  const events: SkyEvent[] = []
  const angular = (h: number) => (h === 1 || h === 4 || h === 7 || h === 10 ? 2 : 0)

  // The reader's own sun season: the strongest sign-specific event there is.
  const ownDays = inMonth.filter((r) => r.sun.sign === sign).length
  if (ownDays > 0) {
    events.push({
      plain:
        ownDays === daysInMonth
          ? "the sun is in the reader's own sign all month, their personal high season"
          : "the sun is in the reader's own sign for part of the month, their personal high season",
      say: 'твоят сезон, слънцето е в твоя знак',
      stems: ['сезон', 'слънц'],
      house: 1,
      score: 10,
    })
  }

  // New and full moon: elongation crossing 0 / 180 between two noons.
  const elong = (r: DayRow) => (((r.moon.lon - r.sun.lon) % 360) + 360) % 360
  for (let i = 0; i < inMonth.length; i++) {
    const a = elong(rows[i]!)
    const b = elong(rows[i + 1]!)
    const h = houseOf(sign, rows[i + 1]!.moon.sign)
    if (a > 300 && b < 60) events.push({ plain: 'a new moon, a fresh start', say: 'новолуние', stems: ['новолун', 'нова луна', 'млада луна'], house: h, score: 5 + angular(h) })
    if (a < 180 && b >= 180) events.push({ plain: 'a full moon, when something comes to a head', say: 'пълнолуние', stems: ['пълнолун', 'пълна луна'], house: h, score: 4 + angular(h) })
  }

  // Mercury seems to run backwards: messages and plans get tangled (said plainly, no jargon).
  if (inMonth.some((r) => r.mercuryRetro)) {
    events.push({
      plain: 'the planet of messages and plans seems to run backwards, so talk and plans get tangled',
      say: 'новините и плановете се бъркат, разговорите се заплитат',
      stems: ['новин', 'план', 'разговор', 'съобщени'],
      house: 3,
      score: 3,
    })
  }

  events.sort((x, y) => y.score - x.score)
  const main: SkyEvent = events[0] ?? { plain: 'a quiet month in the sky', say: 'тих месец', stems: [], house: 1, score: 0 }
  const h = HOUSE[main.house - 1]!

  // One idea per sign, chosen by the sign's place in the zodiac, so neighbours differ.
  const idea = h.ideas[(SIGN_KEYS.indexOf(sign) + month) % h.ideas.length]!

  return {
    stems: main.stems,
    text: [
      `Main sky event for this sign this month: ${main.plain}. Say it in plain Bulgarian as: ${main.say}.`,
      `It touches this area of the reader's life: ${h.area}.`,
      `This sign's character: ${SIGN_TRAIT[sign]}. Let the suggestion fit it.`,
      `Base the suggestion on this idea (reword it in your own plain words and make it fit this sign): ${idea}.`,
    ].join('\n'),
  }
}

// First-person plural ("we") is not allowed in the Oracle's voice.
const WE_WORDS = ['ние', 'нас', 'ни']
const usesWe = (text: string) =>
  text
    .toLowerCase()
    .split(/[^\p{L}]+/u)
    .some((w) => WE_WORDS.includes(w) || w.startsWith('наш'))

// Astrology jargon the note must not contain (checked as stems, case-insensitive).
const JARGON = ['ретроград', 'транзит', 'аспект', 'тригон', 'квадрат', 'оппозиц', 'конюнкц', 'асцендент', 'дом ']
// A note that both pushes forward and slows down contradicts itself.
const GO_WORDS = ['започни', 'начало', 'твори', 'тръгни', 'действай', 'ускори', 'напред']
const REST_WORDS = ['почивай', 'почивка', 'отпочини', 'спри', 'забави', 'пауза', 'покой']
const BAD_STARTS = ['време', 'подреди']

export const firstWord = (text: string) => text.toLowerCase().match(/[\p{L}]+/u)?.[0] ?? ''
/** First word of each sentence: the verbs/openers that must differ across signs. */
export const startWords = (text: string): string[] =>
  text
    .split(/(?<=[.!?])\s+/)
    .map(firstWord)
    .filter(Boolean)
const sentenceCount = (text: string) => (text.match(/[.!?](\s|$)/g) ?? []).length

export type SignMonthResult =
  | { ok: true; content: string; model: string; attempts: number }
  | { ok: false; reason: string; attempts: number }

/** Why a candidate note is rejected, or null when it passes every rule. */
export function rejectReason(
  cleaned: string,
  sign: ZodiacSign,
  usedStarts: string[],
  stems: string[] = [],
): string | null {
  const v = validateReading(cleaned, {}, { minWords: 6, maxWords: 16 })
  if (!v.ok) return `${v.code}: ${v.detail}`
  if (sentenceCount(cleaned) !== 2) return 'NOT_TWO_SENTENCES'
  if (!fitsMonthText(cleaned)) return 'TOO_LONG: does not fit two lines on a 360px screen'
  if (usesWe(cleaned)) return 'FIRST_PERSON_PLURAL'
  const lower = cleaned.toLowerCase()
  if (lower.includes('с лекота')) return 'BANNED_PHRASE: с лекота'
  if (BAD_STARTS.includes(firstWord(cleaned))) return `BANNED_START: ${firstWord(cleaned)}`
  const starts = startWords(cleaned)
  const used = usedStarts.map((w) => w.toLowerCase())
  const clash = starts.find((w, i) => used.includes(w) || starts.indexOf(w) !== i)
  if (clash) return `START_ALREADY_USED: ${clash}`
  if (stems.length > 0 && !stems.some((st) => (cleaned.split(/(?<=[.!?])\s+/)[0] ?? '').toLowerCase().includes(st))) {
    return 'FIRST_SENTENCE_DOES_NOT_NAME_THE_SKY_EVENT'
  }
  if (JARGON.some((j) => lower.includes(j))) return 'JARGON'
  if (GO_WORDS.some((w) => lower.includes(w)) && REST_WORDS.some((w) => lower.includes(w))) return 'CONTRADICTS_ITSELF'
  if (cleaned.includes(ZODIAC_SIGNS_BG[sign]) || MONTHS_BG.some((m) => lower.includes(m))) return 'NAMES_SIGN_OR_MONTH'
  return null
}

/**
 * One sign, up to 4 tries. Each rejection tells the model what was wrong.
 * `usedStarts` = the first word of each sentence of the notes already written for the other signs this month.
 */
export async function generateSignMonthText(
  sign: ZodiacSign,
  ym: string,
  usedStarts: string[] = [],
): Promise<SignMonthResult> {
  const system = buildSignMonthSystemPrompt()
  const facts = await buildSkyFacts(ym, sign)
  const base = buildSignMonthUserPrompt(sign, monthNameBg(ym), facts.text, usedStarts)
  let note = ''
  let reason = 'no attempt'

  for (let attempt = 1; attempt <= 4; attempt++) {
    const { model, text } = await generateFinalText({
      system,
      prompt: base + note,
      maxOutputTokens: 3000,
      fallbackModel: ORACLE_FALLBACK_MODEL,
      thinkingLevel: GEMINI_THINKING_LEVEL.horoscope,
    })
    const cleaned = text.replace(/\s+/g, ' ').trim()
    const why = rejectReason(cleaned, sign, usedStarts, facts.stems)
    if (why === null) return { ok: true, content: cleaned, model, attempts: attempt }
    reason = why
    note = `\n\nYour previous answer was rejected (${why}). Fix exactly that. Write exactly two plain sentences, at most 55 characters in total.`
  }
  return { ok: false, reason, attempts: 4 }
}
