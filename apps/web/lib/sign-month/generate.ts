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

/**
 * Whole-sign houses: house 1 is the reader's own sign. For each area: its plain name, how to say
 * it in Bulgarian after "новолунието/пълнолунието", and a few REFLECTIVE invitations that fit
 * anyone of any sign. They never assume the reader's circumstances (no debts, partners, jobs,
 * relatives): an invitation to notice or choose, not a chore.
 */
const HOUSE: { area: string; areaBg: string; invites: string[] }[] = [
  { area: 'yourself', areaBg: 'в твоя знак', invites: ['notice what you want to be known for', 'choose one quality you want to show more', 'give your attention to how you begin your days'] },
  { area: 'personal finances and values', areaBg: 'в личните финанси и ценностите', invites: ['notice what you truly value', 'ask yourself what is enough', 'notice where your energy actually goes'] },
  { area: 'communication and learning', areaBg: 'в общуването и ученето', invites: ['say one honest thing out loud', 'listen to someone without hurrying', 'notice the words you use about yourself'] },
  { area: 'home and family', areaBg: 'у дома и в семейството', invites: ['notice what makes a place feel like home', 'make room for rest in your space', 'think about what you carry from where you come from'] },
  { area: 'joy and creativity', areaBg: 'в радостта и творчеството', invites: ['let yourself enjoy something without a reason', 'follow what makes you playful', 'notice what you make just for yourself'] },
  { area: 'daily rhythm and health', areaBg: 'в ежедневието и здравето', invites: ['notice what your body asks for', 'choose one small habit that serves you', 'look at what your days are made of'] },
  { area: 'close bonds', areaBg: 'във връзките', invites: ['notice what you give and what you receive', 'ask what closeness means to you', 'make space for someone to be heard'] },
  { area: 'shared finances and deep change', areaBg: 'в общите финанси и дълбоките промени', invites: ['notice what you hold on to and what you could let go', 'allow yourself to need others', 'look at what is ready to change'] },
  { area: 'horizons and beliefs', areaBg: 'в далечните хоризонти и убежденията', invites: ['stay curious about something new', 'ask yourself what you believe and why', 'let a bigger question in'] },
  { area: 'life goals and recognition', areaBg: 'в житейските цели и признанието', invites: ['notice what you want to be remembered for', 'choose what deserves your effort', 'see which work feels like yours'] },
  { area: 'friendships and hopes', areaBg: 'в приятелствата и мечтите', invites: ['notice who lifts you', 'name a hope without judging it', 'share a wish with someone you trust'] },
  { area: 'quiet and endings', areaBg: 'в тишината и завършванията', invites: ['allow yourself a quiet moment', 'notice what is quietly ending', 'rest without having to earn it'] },
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
      say: 'сезонът ти започва (или е в разгара си), вниманието е към теб',
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
    if (a > 300 && b < 60) events.push({ plain: 'a new moon, a fresh start', say: h === 1 ? 'новолунието е в твоя знак' : `новолунието ${HOUSE[h - 1]!.areaBg}`, stems: ['новолун', 'нова луна', 'млада луна'], house: h, score: 5 + angular(h) })
    if (a < 180 && b >= 180) events.push({ plain: 'a full moon, when something comes to a head', say: h === 1 ? 'пълнолунието е в твоя знак' : `пълнолунието ${HOUSE[h - 1]!.areaBg}`, stems: ['пълнолун', 'пълна луна'], house: h, score: 4 + angular(h) })
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

  // One reflective invitation per sign, chosen by the sign's place in the zodiac, so neighbours differ.
  const idea = h.invites[(SIGN_KEYS.indexOf(sign) + month) % h.invites.length]!

  return {
    stems: main.stems,
    text: [
      `Main sky event for this sign this month: ${main.plain}. Say it in plain Bulgarian as: ${main.say}.`,
      `The area of life it touches: ${h.area}.`,
      `This sign's character: ${SIGN_TRAIT[sign]}. Let the tone fit it.`,
      `Sentence 2 is a gentle invitation that fits ANYONE of this sign, based on this (reword it in your own plain words): ${idea}.`,
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
const STOCK_PHRASE = 'ново начало'
// Adjectives that agree with the reader and so reveal gender (свободен/свободна). Not exhaustive:
// the prompt is the main guard; this catches the common ones.
const GENDERED = ['свободен', 'свободна', 'готов', 'готова', 'сам', 'сама', 'спокоен', 'спокойна', 'щастлив', 'щастлива', 'силен', 'силна', 'уверен', 'уверена', 'смел', 'смела', 'добър', 'добра']
/** What to remember from a finished note so later signs vary: its opening verb and any stock phrase. */
export const usedMarkers = (text: string): string[] => [
  ...startWords(text).slice(1),
  ...(text.toLowerCase().includes(STOCK_PHRASE) ? [STOCK_PHRASE] : []),
]
// Words that assume the reader's circumstances (debt, a partner, a job, relatives, a house that
// needs fixing...). The note must fit anyone of the sign, so none of these may appear.
const ASSUMES = ['дълг', 'сметк', 'рисунк', 'резюме', 'роднин', 'счупен', 'шеф', 'партньор', 'проект', 'работодат', 'дете', 'деца', 'съпру', 'гадже', 'брак', 'пари ', 'бюджет']
// Chores, not invitations: the note invites, it does not assign tasks.
const CHORES = ['плати', 'обнови', 'поправи', 'продай', 'изпрати', 'позвъни', 'почисти', 'запиши', 'предай', 'смени', 'поискай', 'сготви']

export const firstWord = (text: string) => text.toLowerCase().match(/[\p{L}]+/u)?.[0] ?? ''
/** First word of each sentence. Index 1 is the opening verb of the invitation. */
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
  if (!fitsMonthText(cleaned)) return 'TOO_LONG: does not fit three lines on a 360px screen'
  if (usesWe(cleaned)) return 'FIRST_PERSON_PLURAL'
  const lower = cleaned.toLowerCase()
  if (lower.includes('с лекота')) return 'BANNED_PHRASE: с лекота'
  if (lower.split(/[^\p{L}]+/u).some((w) => GENDERED.includes(w))) return 'GENDERED_FORM'
  if (lower.includes('в теб')) return 'BANNED_PHRASE: в теб (say «в твоя знак»)'
  const assumed = ASSUMES.find((w) => lower.includes(w))
  if (assumed) return `ASSUMES_CIRCUMSTANCES: ${assumed}`
  const chore = CHORES.find((w) => startWords(cleaned).slice(1).includes(w))
  if (chore) return `CHORE_NOT_INVITATION: ${chore}`
  if (BAD_STARTS.includes(firstWord(cleaned))) return `BANNED_START: ${firstWord(cleaned)}`
  const starts = startWords(cleaned)
  const used = usedStarts.map((w) => w.toLowerCase())
  // Only the VERB that opens sentence 2 must differ from the other signs' (sentence 1 naturally
  // opens with the event: Новолунието, Пълнолунието, Сезонът).
  const verb = starts[1]
  if (verb && used.includes(verb)) return `VERB_ALREADY_USED: ${verb}`
  // The stock phrase «ново начало» may appear in at most one note per month.
  if (lower.includes(STOCK_PHRASE) && used.includes(STOCK_PHRASE)) return `PHRASE_ALREADY_USED: ${STOCK_PHRASE}`
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
 * `usedStarts` = the opening verb of sentence 2 of the notes already written for the other signs this month.
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
    note = `\n\nYour previous answer was rejected (${why}). Fix exactly that. Write exactly two sentences, at most 95 characters in total.`
  }
  return { ok: false, reason, attempts: 4 }
}
