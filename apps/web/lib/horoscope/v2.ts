/**
 * Server-side switch for the Днес v2 horoscope (3 short parts, no numbers).
 *
 * OFF (default): the route behaves exactly as before the redesign. Same prompt, same
 * validation, so the live web Днес and the old mobile screen see no change.
 * ON: the new prompt and the strict 3-part validator, and `?upgrade=1` may replace
 * an old-format row for today. Flip it together with EXPO_PUBLIC_FF_DNES_V2.
 */
export { isNewFormatHoroscope } from '@stellaeum/core/dnes/text-fit'

export function dnesV2Server(): boolean {
  return process.env.FF_DNES_V2_SERVER === 'true'
}
