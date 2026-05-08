/**
 * Composes the dynamic welcoming subtitle on the dashboard.
 *
 * Pulls from multiple signals so the message changes with the sky, not
 * just the user:
 *   - natal chart: sun sign (derived from birth date)
 *   - lunar phases: current phase id + illumination
 *   - meteor showers: active shower window (annual events)
 *   - time of day: morning / afternoon / evening / night
 *   - horoscope teaser: short optional quip pulled from the daily horoscope
 *
 * Transits aren't wired through yet since the dashboard doesn't fetch
 * them up-front; the composer degrades gracefully when any signal is
 * missing.
 */

import type { LunarPhase } from '../lib/moon-phase'
import type { MeteorShower } from './meteor-showers'

export interface WelcomeContext {
  firstName: string
  sunSign: string | null
  lunarPhase: LunarPhase
  meteorShower: MeteorShower | null
  hour: number // 0-23 local time
  /** Optional short teaser pulled from the daily horoscope. */
  horoscopeTeaser?: string | null
}

export interface WelcomeLines {
  /** Short greeting "Добро утро" / "Добър ден" / etc. */
  greeting: string
  /** 1-2 sentence dynamic summary weaving phase + sign + meteors. */
  summary: string
  /** Optional horoscope teaser line, if one was supplied. */
  teaser?: string
}

function getTimeOfDay(hour: number): 'morning' | 'afternoon' | 'evening' | 'night' {
  if (hour >= 5 && hour < 12) return 'morning'
  if (hour >= 12 && hour < 18) return 'afternoon'
  if (hour >= 18 && hour < 22) return 'evening'
  return 'night'
}

function timeGreeting(tod: ReturnType<typeof getTimeOfDay>): string {
  switch (tod) {
    case 'morning':   return 'Добро утро'
    case 'afternoon': return 'Добър ден'
    case 'evening':   return 'Добър вечер'
    case 'night':     return 'Благословена нощ'
  }
}

/**
 * Phase-specific opening that already accounts for the current illumination.
 * These are the fixed half of the summary; the dynamic half is the sign tail.
 */
const PHASE_OPENERS: Record<LunarPhase['id'], (illum: number) => string> = {
  new: () =>
    'Новолуние. Чист лист за нови начала — сега е моментът да поставиш намерения.',
  waxing_crescent: () =>
    'Изгряващ полумесец подхранва посеяното. Първата конкретна стъпка брои най-много.',
  first_quarter: () =>
    'Първа четвърт. Половината път между новолунието и пълнолунието — време за решения и воля.',
  waxing_gibbous: (illum) =>
    `Растяща луна, ${illum}% осветена. Настройваш детайлите преди пълнолунието.`,
  full: () =>
    'Пълнолуние, пикова енергия. Празнувай постигнатото и освободи онова, което вече не ти служи.',
  waning_gibbous: (illum) =>
    `Намаляваща луна, ${illum}% осветена. Време за благодарност за научените уроци и тих преход назад към себе си.`,
  last_quarter: () =>
    'Последна четвърт. Прости, освободи и приключи това, което не работи — правиш място за новото.',
  waning_crescent: () =>
    'Залязващ полумесец. Време за почивка, възстановяване и тишина преди следващото новолуние.',
}

/**
 * Per-sign flavor for each phase. Keeps the whole thing short (1 sentence).
 * We pick from element groups to stay maintainable rather than writing
 * 8x12 = 96 unique lines.
 */
type Element = 'fire' | 'earth' | 'air' | 'water'

const SIGN_ELEMENT: Record<string, Element> = {
  'Овен': 'fire', 'Лъв': 'fire', 'Стрелец': 'fire',
  'Телец': 'earth', 'Дева': 'earth', 'Козирог': 'earth',
  'Близнаци': 'air', 'Везни': 'air', 'Водолей': 'air',
  'Рак': 'water', 'Скорпион': 'water', 'Риби': 'water',
}

/** element + phase -> short flavor sentence */
const ELEMENT_PHASE_TAIL: Record<Element, Record<LunarPhase['id'], string>> = {
  fire: {
    new:             'Огънят в теб обича празни листи. Запиши дръзко и тръгни.',
    waxing_crescent: 'Първата искра е твоята стихия — използвай я.',
    first_quarter:   'Огненият знак обича кръстопът. Реши и не се оглеждай.',
    waxing_gibbous:  'Натрупаният импулс сега иска прецизност, а не още сила.',
    full:            'Пълнолунието те кара да грееш публично. Позволи си го.',
    waning_gibbous:  'Време е да благодариш на тези, които донесоха пламъка заедно с теб.',
    last_quarter:    'Огънят се пречиства, когато прегори старото. Остави пепелта.',
    waning_crescent: 'Дори огънят има нужда от тихи въглени. Почивай без вина.',
  },
  earth: {
    new:             'Земният знак обича конкретни намерения. Превърни мечтата в списък.',
    waxing_crescent: 'Строй основата. Твоята природа вече знае как.',
    first_quarter:   'Решенията ти държат цикъла стабилен. Вярвай на търпението си.',
    waxing_gibbous:  'Настройвай детайлите — ти си майстор в това.',
    full:            'Пожъни посятото. Земята помни всяка стъпка.',
    waning_gibbous:  'Благодарност за труда. Твоят знак я изразява най-искрено.',
    last_quarter:    'Пусни онова, което вече не носи плод. Почвата иска покой.',
    waning_crescent: 'Пусни корени. Остави тялото да си отдъхне напълно.',
  },
  air: {
    new:             'Въздушният знак носи нови идеи. Запиши ги, преди да отлетят.',
    waxing_crescent: 'Разговор или текст ще отключи следващата стъпка. Задай въпроса.',
    first_quarter:   'Претегли алтернативите веднъж, после действай. Не преповтаряй безкрайно.',
    waxing_gibbous:  'Остри думи, ясна мисъл. Комуникацията сега е твоят инструмент.',
    full:            'Споделяй. Твоите идеи имат нужда от публика под тази луна.',
    waning_gibbous:  'Обобщи наученото. Думите вкарват урока в трайна форма.',
    last_quarter:    'Пусни мисли, които те държат в кръг. Смени посоката на разговора.',
    waning_crescent: 'Тишина, вместо анализ. Умът ти има нужда от пауза.',
  },
  water: {
    new:             'Интуицията ти вижда повече, отколкото мозъкът признава. Слушай я.',
    waxing_crescent: 'Емоцията е гориво. Позволи ѝ да задвижи първата стъпка.',
    first_quarter:   'Не всяко напрежение е криза. Остани в чувството, без да бягаш.',
    waxing_gibbous:  'Балансът сега е почти емоционален. Кое ти се усеща правилно?',
    full:            'Пълнолунието усилва всичко, което усещаш. Плачи, смей се, танцувай.',
    waning_gibbous:  'Благодарност и прошка се кръстосват. И двете ти подхождат.',
    last_quarter:    'Пусни стари рани. Водата знае как да се обнови.',
    waning_crescent: 'Сънувай. Ваните, чайовете и тишината са твоят лек.',
  },
}

function signTail(sunSign: string | null, phaseId: LunarPhase['id']): string | null {
  if (!sunSign) return null
  const el = SIGN_ELEMENT[sunSign]
  if (!el) return null
  return ELEMENT_PHASE_TAIL[el][phaseId]
}

/**
 * Optional meteor note added at the end if a shower is currently active.
 */
function meteorNote(shower: MeteorShower | null): string | null {
  if (!shower) return null
  return `Небето върви през потока на ${shower.name} (${shower.latin}) — погледни нагоре след полунощ.`
}

export function composeWelcome(ctx: WelcomeContext): WelcomeLines {
  const tod = getTimeOfDay(ctx.hour)
  const greeting = `${timeGreeting(tod)}, ${ctx.firstName}.`

  const opener = PHASE_OPENERS[ctx.lunarPhase.id](ctx.lunarPhase.illumination)
  const tail = signTail(ctx.sunSign, ctx.lunarPhase.id)
  const meteor = meteorNote(ctx.meteorShower)

  const parts = [opener, tail, meteor].filter((p): p is string => !!p)
  const summary = parts.join(' ')

  return {
    greeting,
    summary,
    teaser: ctx.horoscopeTeaser ?? undefined,
  }
}
