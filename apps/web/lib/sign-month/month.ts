/** «YYYY-MM» of `now` in Europe/Sofia (the month the Днес page 3 text belongs to). */
export function sofiaYearMonth(now: Date): string {
  const [y, m] = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Sofia',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  })
    .format(now)
    .split('-')
  return `${y}-${m}`
}

/** Day of the month (1-31) of `now` in Europe/Sofia. */
export function sofiaDayOfMonth(now: Date): number {
  return Number(
    new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Sofia', day: '2-digit' }).format(now),
  )
}

/** The month after «YYYY-MM». */
export function nextYearMonth(ym: string): string {
  const y = Number(ym.slice(0, 4))
  const m = Number(ym.slice(5, 7))
  return m === 12 ? `${y + 1}-01` : `${y}-${String(m + 1).padStart(2, '0')}`
}
