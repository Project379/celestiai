/**
 * Annual meteor showers (Bulgarian). Dates are consistent year over year
 * to within a day, so we hard-code month/day peaks and active windows.
 *
 * Reference: IMO (International Meteor Organization) 2024-2026 calendar.
 */

export interface MeteorShower {
  id: string
  name: string // Bulgarian
  latin: string
  peakMonth: number // 1-12
  peakDay: number
  /** Active window, inclusive. May wrap year boundary (e.g. Quadrantids). */
  startMonth: number
  startDay: number
  endMonth: number
  endDay: number
  zhr: number // zenithal hourly rate at peak
  parentBody: string
  radiant: string // constellation of origin (Bulgarian)
  description: string // short, editorial
}

export const METEOR_SHOWERS: MeteorShower[] = [
  {
    id: 'quadrantids',
    name: 'Квадрантиди',
    latin: 'Quadrantids',
    peakMonth: 1, peakDay: 3,
    startMonth: 12, startDay: 28, endMonth: 1, endDay: 12,
    zhr: 110,
    parentBody: '(196256) 2003 EH1',
    radiant: 'Волопас',
    description: 'Кратък, но интензивен поток в началото на януари. Върховата нощ носи над сто метеора на час.',
  },
  {
    id: 'lyrids',
    name: 'Лириди',
    latin: 'Lyrids',
    peakMonth: 4, peakDay: 22,
    startMonth: 4, startDay: 16, endMonth: 4, endDay: 30,
    zhr: 18,
    parentBody: 'Комета C/1861 G1 Тачер',
    radiant: 'Лира',
    description: 'Пролетен поток с ярки метеори и редки, но впечатляващи изблици до сто на час.',
  },
  {
    id: 'eta_aquariids',
    name: 'Ета Аквариди',
    latin: 'Eta Aquariids',
    peakMonth: 5, peakDay: 6,
    startMonth: 4, startDay: 19, endMonth: 5, endDay: 28,
    zhr: 50,
    parentBody: 'Комета на Халей',
    radiant: 'Водолей',
    description: 'Остатъци от Халеевата комета. Най-видими преди разсъмване от тъмни места.',
  },
  {
    id: 'delta_aquariids',
    name: 'Делта Аквариди',
    latin: 'Southern Delta Aquariids',
    peakMonth: 7, peakDay: 30,
    startMonth: 7, startDay: 12, endMonth: 8, endDay: 23,
    zhr: 25,
    parentBody: 'Комета 96P/Макхолц',
    radiant: 'Водолей',
    description: 'Лек летен поток с меки, сравнително бавни метеори.',
  },
  {
    id: 'perseids',
    name: 'Персеиди',
    latin: 'Perseids',
    peakMonth: 8, peakDay: 12,
    startMonth: 7, startDay: 17, endMonth: 8, endDay: 24,
    zhr: 100,
    parentBody: 'Комета 109P/Суифт-Тътъл',
    radiant: 'Персей',
    description: 'Най-обичаният годишен поток. Топла августовска нощ носи до сто метеора на час, много от тях ярки и с дълги следи.',
  },
  {
    id: 'orionids',
    name: 'Ориониди',
    latin: 'Orionids',
    peakMonth: 10, peakDay: 21,
    startMonth: 10, startDay: 2, endMonth: 11, endDay: 7,
    zhr: 20,
    parentBody: 'Комета на Халей',
    radiant: 'Орион',
    description: 'Вторите годишни остатъци от Халей. Бързи метеори с тънки светещи следи.',
  },
  {
    id: 'leonids',
    name: 'Леониди',
    latin: 'Leonids',
    peakMonth: 11, peakDay: 17,
    startMonth: 11, startDay: 6, endMonth: 11, endDay: 30,
    zhr: 15,
    parentBody: 'Комета 55P/Темпел-Тътъл',
    radiant: 'Лъв',
    description: 'Бърз ноемврийски поток. Веднъж на 33 години носи метеорна буря с хиляди метеори на час.',
  },
  {
    id: 'geminids',
    name: 'Геминиди',
    latin: 'Geminids',
    peakMonth: 12, peakDay: 14,
    startMonth: 12, startDay: 4, endMonth: 12, endDay: 20,
    zhr: 120,
    parentBody: '(3200) Фаетон',
    radiant: 'Близнаци',
    description: 'Най-плътният поток на годината. Яркожълти метеори, до 120 на час през декемврийската върхова нощ.',
  },
  {
    id: 'ursids',
    name: 'Урсиди',
    latin: 'Ursids',
    peakMonth: 12, peakDay: 22,
    startMonth: 12, startDay: 17, endMonth: 12, endDay: 26,
    zhr: 10,
    parentBody: 'Комета 8P/Тътъл',
    radiant: 'Малката мечка',
    description: 'Тих зимен поток точно след зимното слънцестоене. Малко, но надеждни метеори за търпеливите наблюдатели.',
  },
]

function dayOfYear(month: number, day: number): number {
  // Uses a non-leap year; adequate for shower windows which are never near Feb 29.
  const cum = [0, 31, 59, 90, 120, 151, 181, 212, 243, 273, 304, 334]
  return cum[month - 1] + day
}

/**
 * Is a given date inside the shower's active window?
 * Handles year-wrap (Quadrantids span Dec → Jan).
 */
function isInActiveWindow(s: MeteorShower, month: number, day: number): boolean {
  const now = dayOfYear(month, day)
  const start = dayOfYear(s.startMonth, s.startDay)
  const end = dayOfYear(s.endMonth, s.endDay)
  if (start <= end) return now >= start && now <= end
  // Wraps year boundary: active if after start OR before end
  return now >= start || now <= end
}

/**
 * The shower whose active window contains `date`, or null.
 * If multiple overlap, prefers the one whose peak is closest to the date.
 */
export function getActiveMeteorShower(date: Date = new Date()): MeteorShower | null {
  const m = date.getMonth() + 1
  const d = date.getDate()
  const active = METEOR_SHOWERS.filter(s => isInActiveWindow(s, m, d))
  if (active.length === 0) return null
  if (active.length === 1) return active[0]
  // Pick the one closest to its peak
  const today = dayOfYear(m, d)
  return active
    .map(s => ({
      s,
      dist: Math.min(
        Math.abs(today - dayOfYear(s.peakMonth, s.peakDay)),
        365 - Math.abs(today - dayOfYear(s.peakMonth, s.peakDay)),
      ),
    }))
    .sort((a, b) => a.dist - b.dist)[0].s
}

/**
 * Next upcoming peak within the next ~3 months. Returns null if nothing soon.
 */
export function getNextMeteorShower(
  date: Date = new Date(),
): { shower: MeteorShower; daysAway: number } | null {
  const today = dayOfYear(date.getMonth() + 1, date.getDate())
  const candidates = METEOR_SHOWERS.map(s => {
    let peakDoy = dayOfYear(s.peakMonth, s.peakDay)
    let diff = peakDoy - today
    if (diff < 0) diff += 365 // wrap around
    return { shower: s, daysAway: diff }
  }).sort((a, b) => a.daysAway - b.daysAway)
  const next = candidates[0]
  if (!next || next.daysAway > 92) return null
  return next
}

/**
 * Days until the active shower's peak (can be negative if past).
 */
export function daysUntilPeak(shower: MeteorShower, date: Date = new Date()): number {
  const today = dayOfYear(date.getMonth() + 1, date.getDate())
  const peak = dayOfYear(shower.peakMonth, shower.peakDay)
  let diff = peak - today
  // Pick the nearest peak (this year's vs next year's)
  if (diff < -30) diff += 365
  return diff
}
