/**
 * How many times, per chart per day, a birth-data edit may cause today's
 * horoscope to be regenerated (each regeneration is a paid Gemini call). Founder
 * ruling 2026-10-01. Beyond it the edit still saves and the horoscope slot shows
 * the quiet failure line. Lives here, not in the route file: a Next.js route.ts
 * may export only framework-recognised fields.
 */
export const MAX_STALE_REGENS_PER_DAY = 3
