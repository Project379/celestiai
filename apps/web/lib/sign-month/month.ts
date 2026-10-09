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
