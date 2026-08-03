/**
 * Sun sign (Bulgarian) from a birth date string.
 *
 * Lifted from apps/web/components/dashboard/DashboardContent.tsx during
 * sub-round 5.4 so mobile can feed composeWelcome with the same Bulgarian
 * sign label web uses. Sign-element-flavor sentence in composeWelcome
 * depends on this output, so the Bulgarian strings must stay in lockstep
 * with SIGN_ELEMENT in compose.ts.
 *
 * Accepts any string parseable by Date — typically the snake_case
 * birth_date column from `charts` (e.g. '1990-04-15T00:00:00.000Z').
 */
export function getSunSign(birthDate: string): string {
  const d = new Date(birthDate)
  const m = d.getMonth() + 1
  const day = d.getDate()
  if ((m === 3 && day >= 21) || (m === 4 && day <= 19)) return 'Овен'
  if ((m === 4 && day >= 20) || (m === 5 && day <= 20)) return 'Телец'
  if ((m === 5 && day >= 21) || (m === 6 && day <= 20)) return 'Близнаци'
  if ((m === 6 && day >= 21) || (m === 7 && day <= 22)) return 'Рак'
  if ((m === 7 && day >= 23) || (m === 8 && day <= 22)) return 'Лъв'
  if ((m === 8 && day >= 23) || (m === 9 && day <= 22)) return 'Дева'
  if ((m === 9 && day >= 23) || (m === 10 && day <= 22)) return 'Везни'
  if ((m === 10 && day >= 23) || (m === 11 && day <= 21)) return 'Скорпион'
  if ((m === 11 && day >= 22) || (m === 12 && day <= 21)) return 'Стрелец'
  if ((m === 12 && day >= 22) || (m === 1 && day <= 19)) return 'Козирог'
  if ((m === 1 && day >= 20) || (m === 2 && day <= 18)) return 'Водолей'
  return 'Риби'
}
