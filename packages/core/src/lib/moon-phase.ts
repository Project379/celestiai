/**
 * Lunar phase calculation + manifesting guidance (Bulgarian).
 *
 * Pure JS synodic-month approximation. Accurate enough for a daily
 * phase display: ±~12h on the exact turning points, visually correct.
 *
 * Tighter "major event" buckets (±1 day around new / first quarter /
 * full / last quarter) match what users actually see in the sky,
 * rather than an even 1/8 split that would call a 2% waning sliver
 * "new moon".
 */

import { first, last } from './invariant'

const SYNODIC_MONTH = 29.530588853
// Reference new moon: 2000-01-06 18:14:00 UTC (well-known astronomical epoch)
const REFERENCE_NEW_MOON_MS = Date.UTC(2000, 0, 6, 18, 14, 0)

export type LunarPhaseId =
  | 'new'
  | 'waxing_crescent'
  | 'first_quarter'
  | 'waxing_gibbous'
  | 'full'
  | 'waning_gibbous'
  | 'last_quarter'
  | 'waning_crescent'

export interface LunarPhase {
  id: LunarPhaseId
  name: string // Bulgarian
  latin: string
  illumination: number // 0-100, rounded
  phaseDay: number // 0 → 29.53
  phaseFraction: number // 0 → 1
  isWaxing: boolean
  intention: string // short 2-3 word call to action
  physicalAppearance: string // astronomical description
  bestFor: string // what the phase supports
  affirmation: string // first-person
  crystal: string // name + short why
  ritual: string // practice suggestion
  journalPrompt: string // single question
  nextMajor: {
    id: LunarPhaseId
    name: string
      daysAway: number // rounded to 0.1
  }
}

interface PhaseMeta {
  id: LunarPhaseId
  name: string
  latin: string
  intention: string
  physicalAppearance: string
  bestFor: string
  affirmation: string
  crystal: string
  ritual: string
  journalPrompt: string
}

const PHASE_META: Record<LunarPhaseId, PhaseMeta> = {
  new: {
    id: 'new',
    name: 'Новолуние',
    latin: 'New Moon',
    intention: 'Постави намерения',
    physicalAppearance:
      'Луната е обърната с тъмната си страна към Земята и обикновено не може да бъде видяна, тъй като се намира между Земята и Слънцето. Изключение е случаят при слънчево затъмнение, когато Луната засенчва Слънцето.',
    bestFor: 'Нови начала, поставяне на намерения, старт на нови проекти.',
    affirmation: 'Отворен/а съм за нови начала.',
    crystal: 'Лабрадоритът подкрепя възстановяването на енергията и духовното обновление.',
    ritual: 'Запиши целите си на хартия, създай визуална дъска за цикъла напред, или изтегли таро карта за насока.',
    journalPrompt: 'Какви нови начала съм готов/а да приема?',
  },
  waxing_crescent: {
    id: 'waxing_crescent',
    name: 'Изгряващ полумесец',
    latin: 'Waxing Crescent',
    intention: 'Изгради импулс',
    physicalAppearance:
      'Тънък сребрист полумесец започва да се появява от дясната страна. Това е първата видима фаза след новолунието, когато Луната започва да расте.',
    bestFor: 'Първи стъпки, подхранване на целите, изграждане на нови навици.',
    affirmation: 'Вярвам в пътя си и правя стъпки към мечтите си уверено.',
    crystal: 'Цитринът стимулира мотивацията, творчеството и привличането на желаното.',
    ritual: 'Запали свещ, медитирай върху намеренията си, запиши ги и визуализирай първата конкретна стъпка.',
    journalPrompt: 'Какви малки стъпки мога да направя днес към по-голямата цел?',
  },
  first_quarter: {
    id: 'first_quarter',
    name: 'Първа четвърт',
    latin: 'First Quarter',
    intention: 'Вземи решение',
    physicalAppearance: 'Дясната половина от лунната повърхност е осветена.',
    bestFor: 'Действия, решения, преодоляване на препятствия.',
    affirmation: 'Доверявам се на себе си и на решенията си.',
    crystal: 'Планинският кристал усилва енергията и изяснява мисленето.',
    ritual: 'Създай визуална дъска за целите си, медитирай върху намеренията и направи поне една конкретна крачка днес.',
    journalPrompt: 'Какви действия са нужни, за да се доближа до целите си?',
  },
  waxing_gibbous: {
    id: 'waxing_gibbous',
    name: 'Растяща луна',
    latin: 'Waxing Gibbous',
    intention: 'Усъвършенствай',
    physicalAppearance:
      'Повече от половината лунна повърхност е осветена, но Луната още не е пълна. Осветената част продължава да расте и покрива все по-голяма част от диска. Нарича се още „млада луна", защото наближава пълнолунието.',
    bestFor: 'Усъвършенстване, настройка на детайлите, търпение преди върха.',
    affirmation: 'Постоянно се подобрявам и се движа към истинското си аз.',
    crystal: 'Планинският кристал изяснява мислите и подготвя ума за успех.',
    ritual: 'Прегледай прогреса си, направи нужните корекции и запиши какво още трябва да се настрои.',
    journalPrompt: 'Какъв прогрес съм направил/а и какво още трябва да се настрои?',
  },
  full: {
    id: 'full',
    name: 'Пълнолуние',
    latin: 'Full Moon',
    intention: 'Празнувай и пусни',
    physicalAppearance:
      'Когато Земята е между Луната и Слънцето. Целият лунен диск е видим, освен при лунно затъмнение.',
    bestFor: 'Празнуване на постиженията, благодарност, освобождаване, самопреглед.',
    affirmation: 'Празнувам прогреса си и почитам пътя си.',
    crystal: 'Лунният камък с дъгова преливка усилва интуицията и женската енергия.',
    ritual: 'Отпразнувай постигнатото, запали свещ, събери близки, практикувай благодарност и честна саморефлексия.',
    journalPrompt: 'Какво постигнах в този цикъл и за какво съм най-благодарен/на?',
  },
  waning_gibbous: {
    id: 'waning_gibbous',
    name: 'Намаляваща луна',
    latin: 'Waning Gibbous',
    intention: 'Благодарност',
    physicalAppearance:
      'Луната започва да намалява и осветлението отслабва от дясната страна. Повече от половината лунна повърхност още е видима, но постепенно се смалява. Нарича се още „стара луна".',
    bestFor: 'Размисъл върху наученото, пускане на стари модели, благодарност за уроците.',
    affirmation: 'Освобождавам онова, което вече не ми служи, с благодарност и благосклонност.',
    crystal: 'Розовият кварц символизира любовта, състраданието и благодарността.',
    ritual: 'Запиши какво искаш да освободиш и го пусни символично, практикувай дълбоко дишане или мека йога.',
    journalPrompt: 'Какво съм готов/а да пусна и какви уроци съм научил/а?',
  },
  last_quarter: {
    id: 'last_quarter',
    name: 'Последна четвърт',
    latin: 'Last Quarter',
    intention: 'Пусни',
    physicalAppearance: 'Лявата половина от лунната повърхност е осветена.',
    bestFor: 'Размисъл, прошка, освобождаване на тежести, подготовка за нов цикъл.',
    affirmation: 'Пускам с любов и се подготвям за новите начала.',
    crystal: 'Аметистът успокоява и подкрепя медитацията и духовния растеж.',
    ritual: 'Медитирай върху прошката, напиши писмо за освобождаване на стари обиди, направи прочистващ ритуал.',
    journalPrompt: 'Какво научих от този цикъл и какво съм готов/а да пусна?',
  },
  waning_crescent: {
    id: 'waning_crescent',
    name: 'Залязващ полумесец',
    latin: 'Waning Crescent',
    intention: 'Почивка',
    physicalAppearance:
      'Луната продължава да намалява и оставя тънък сребрист полумесец от лявата страна. Това е последната видима фаза преди следващото новолуние.',
    bestFor: 'Почивка, възстановяване, интроспекция, подготовка за новия цикъл.',
    affirmation: 'Предавам се на потока на живота и приемам силата на почивката.',
    crystal: 'Аметистът подкрепя почивката, съня и духовното възстановяване.',
    ritual: 'Възстановителна йога, топла вана с успокоителни билки, медитация върху предаване и приемане.',
    journalPrompt: 'Как мога да се подхраня преди новото начало?',
  },
}

/**
 * Boundaries use tighter ±1 day windows around each of the 4 major events
 * (new / first quarter / full / last quarter), with crescent & gibbous
 * phases filling the gaps. This matches visual expectations better than an
 * equal 1/8 split, which would label a 2% waning sliver "new moon".
 */
const QUARTER = SYNODIC_MONTH / 4 // 7.38265
const MAJOR_HALF_WIDTH = 1 // ±1 day around each major event

const BOUNDARIES: Array<{ maxDay: number; id: LunarPhaseId }> = [
  { maxDay: MAJOR_HALF_WIDTH, id: 'new' },                            // 0 → 1
  { maxDay: QUARTER - MAJOR_HALF_WIDTH, id: 'waxing_crescent' },      // 1 → 6.38
  { maxDay: QUARTER + MAJOR_HALF_WIDTH, id: 'first_quarter' },        // 6.38 → 8.38
  { maxDay: QUARTER * 2 - MAJOR_HALF_WIDTH, id: 'waxing_gibbous' },   // 8.38 → 13.77
  { maxDay: QUARTER * 2 + MAJOR_HALF_WIDTH, id: 'full' },             // 13.77 → 15.77
  { maxDay: QUARTER * 3 - MAJOR_HALF_WIDTH, id: 'waning_gibbous' },   // 15.77 → 21.15
  { maxDay: QUARTER * 3 + MAJOR_HALF_WIDTH, id: 'last_quarter' },     // 21.15 → 23.15
  { maxDay: QUARTER * 4 - MAJOR_HALF_WIDTH, id: 'waning_crescent' },  // 23.15 → 28.53
  { maxDay: SYNODIC_MONTH + 0.01, id: 'new' },                        // 28.53 → 29.54
]

const MAJOR_EVENTS: Array<{ day: number; id: LunarPhaseId }> = [
  { day: 0, id: 'new' },
  { day: QUARTER, id: 'first_quarter' },
  { day: QUARTER * 2, id: 'full' },
  { day: QUARTER * 3, id: 'last_quarter' },
  { day: SYNODIC_MONTH, id: 'new' },
]

export function getLunarPhase(date: Date = new Date()): LunarPhase {
  const raw = (date.getTime() - REFERENCE_NEW_MOON_MS) / 86400000
  let phaseDay = raw % SYNODIC_MONTH
  if (phaseDay < 0) phaseDay += SYNODIC_MONTH

  const phaseFraction = phaseDay / SYNODIC_MONTH
  const illumination = ((1 - Math.cos(2 * Math.PI * phaseFraction)) / 2) * 100
  const isWaxing = phaseDay < SYNODIC_MONTH / 2

  // BOUNDARIES and MAJOR_EVENTS are compile-time constants with multiple
  // entries; find() always resolves in practice but TS can't prove it under
  // noUncheckedIndexedAccess. first()/last() provide loud throws if the
  // invariant is ever violated — prefer them over `!` which silently
  // becomes undefined at runtime. See ./invariant.ts for the why.
  const boundaryMatch = BOUNDARIES.find((b) => phaseDay < b.maxDay) ?? first(BOUNDARIES)
  const phaseId = boundaryMatch.id
  const meta = PHASE_META[phaseId]

  const next = MAJOR_EVENTS.find((e) => e.day > phaseDay + 0.05) ?? last(MAJOR_EVENTS)
  const daysAway = next.day - phaseDay
  const nextMeta = PHASE_META[next.id]

  return {
    id: meta.id,
    name: meta.name,
    latin: meta.latin,
    illumination: Math.round(illumination),
    phaseDay,
    phaseFraction,
    isWaxing,
    intention: meta.intention,
    physicalAppearance: meta.physicalAppearance,
    bestFor: meta.bestFor,
    affirmation: meta.affirmation,
    crystal: meta.crystal,
    ritual: meta.ritual,
    journalPrompt: meta.journalPrompt,
    nextMajor: {
      id: next.id,
      name: nextMeta.name,
      daysAway: Math.round(daysAway * 10) / 10,
    },
  }
}

export const ALL_LUNAR_PHASES: PhaseMeta[] = [
  PHASE_META.new,
  PHASE_META.waxing_crescent,
  PHASE_META.first_quarter,
  PHASE_META.waxing_gibbous,
  PHASE_META.full,
  PHASE_META.waning_gibbous,
  PHASE_META.last_quarter,
  PHASE_META.waning_crescent,
]
