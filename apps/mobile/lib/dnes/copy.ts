// All user-facing Bulgarian for Днес v2 lives here (a content-home file, locked by
// scripts/i18n/copy-lock.json). Approved by the founder 2026-10-09 against the strings
// table in the step-1 report. Add or change a line only with the founder's say-so.
//
// Voice: plain UI is neutral, no first person; the Oracle's lines carry no gender.

export const DNES_COPY = {
  // Swipe titles. The same words label the page dots for screen readers.
  pageSigns: 'Твоите знаци',
  pageMoon: 'Луната днес',
  pageMonth: 'Твоят месец',
  pageCrystal: 'Кристал на деня',

  // Page 1
  moonColumn: 'Луна',
  // Birth time unknown and the Moon changes sign during the birth day: the sign is an estimate.
  moonColumnApprox: 'Луна · прибл.',
  sunColumn: 'Твоята зодия',
  ascendantColumn: 'Асцендент',
  signUnknown: '—',

  // Page 2
  moreLink: 'Повече',
  moonWaxing: 'Растяща',
  moonWaning: 'Намаляваща',
  illuminated: 'осветена',
  today: 'днес',
  tomorrow: 'утре',
  inDays: 'след',
  days: 'дни',

  // Page 4
  collect: 'Събери',
  collected: 'Събрано',

  // Horoscope
  horoscopeHeading: 'Дневен хороскоп',
  levelSky: 'Небето днес',
  levelFeel: 'Как ще го усетиш',
  levelAdvice: 'Съвет за деня',
  loading: 'Небето се подрежда…',
  // The one canonical AI-unavailable message; do not reword.
  unavailable: 'Звездите са временно недостъпни. Опитай отново след малко.',

  // Exit
  askOracle: 'Питай Оракула',

  // No chart yet (same lines the old Днес uses)
  noChartBody:
    'Картата ти още не е настроена. Въведи рождените си данни, за да видиш хороскопа, наталната карта и транзитите.',
  noChartCta: 'Въведи рождени данни',
} as const
