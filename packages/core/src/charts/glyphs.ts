import type { ZodiacSign } from '@stellaeum/astrology/client'

/**
 * Zodiac glyph SVG path data — single source of truth across web and
 * mobile. Each entry is an array of SVG `d` attribute strings to be
 * rendered as <path> elements inside a 24×24 viewBox with stroke 1.5,
 * round caps, round joins. Both surfaces import this constant; web's
 * CelestialIcons zodiac components and apps/mobile's NatalWheel outer-
 * ring glyphs render the same paths.
 *
 * Geometry lifted from apps/web/components/icons/CelestialIcons.tsx.
 * Original used a mix of <path> and <circle> primitives; circles have
 * been converted to equivalent path arcs (M + two A commands) so a
 * single `string[]` shape covers every glyph. Visually identical
 * output; renderer iterates paths only.
 *
 * Stroke style is the responsibility of the consumer. Web inherits via
 * <Svg>'s shared BASE attrs; mobile sets stroke="..." per-Path or via
 * a wrapping <G>. View-box for all glyphs is fixed at 0 0 24 24.
 */
export const ZODIAC_GLYPH_PATHS: Record<ZodiacSign, readonly string[]> = {
  aries: [
    'M12 21V13L4 6C1 6 1 11 4 11',
    'M12 13L20 6C23 6 23 11 20 11',
  ],
  taurus: [
    // Original: <circle cx={12} cy={16} r={5.5} />
    'M 6.5 16 A 5.5 5.5 0 1 0 17.5 16 A 5.5 5.5 0 1 0 6.5 16 Z',
    'M4 4c0 4 3.5 6.5 8 6.5s8-2.5 8-6.5',
  ],
  gemini: [
    'M5 3h14',
    'M5 21h14',
    'M8 3c-.5 4-.5 14 0 18',
    'M16 3c.5 4 .5 14 0 18',
  ],
  cancer: [
    'M4 10c0-5 16-5 16 0',
    'M20 14c0 5-16 5-16 0',
    // Original: <circle cx={7} cy={10} r={3} />
    'M 4 10 A 3 3 0 1 0 10 10 A 3 3 0 1 0 4 10 Z',
    // Original: <circle cx={17} cy={14} r={3} />
    'M 14 14 A 3 3 0 1 0 20 14 A 3 3 0 1 0 14 14 Z',
  ],
  leo: [
    // Original: <circle cx={8} cy={14} r={4.5} />
    'M 3.5 14 A 4.5 4.5 0 1 0 12.5 14 A 4.5 4.5 0 1 0 3.5 14 Z',
    'M12.5 14c0-6 3-10 5-10s3 2 3 4-2 4-4 3',
  ],
  virgo: [
    'M4 20V8c0-3 3-4 4-1v13',
    'M8 20V8c0-3 3-4 4-1v13',
    'M12 20V8c0-3 3-4 4-1v5',
    'M16 12c0 3 2 5 4 4',
    'M18.5 12l2 6',
  ],
  libra: [
    'M3 20h18',
    'M3 15h18',
    'M7 15a5 5 0 0 1 10 0',
  ],
  scorpio: [
    'M4 20V8c0-3 3-4 4-1v13',
    'M8 20V8c0-3 3-4 4-1v13',
    'M12 20V8c0-3 3-4 4-1v8c0 3 2 5 4 4',
    'M18 16l3 3-3 3',
  ],
  sagittarius: [
    'M4 20L20 4',
    'M13 4h7v7',
    'M7 13l5 5',
  ],
  capricorn: [
    'M 5.5 8 Q 7 7 8.5 9 L 8.5 16',
    'M 8.5 9 C 8.5 4 14.5 4 14.5 9 V 15 C 14.5 18.5 19.5 20.5 19.5 16 C 19.5 11.5 13.5 11.5 13.5 16 C 13.5 20.5 11.5 21.5 10.5 20.5',
  ],
  aquarius: [
    'M3 9l2.5-3 3 3 3-3 3 3 3-3 2.5 3',
    'M3 16l2.5-3 3 3 3-3 3 3 3-3 2.5 3',
  ],
  pisces: [
    'M4 12h16',
    'M4 4c6 4 6 12 0 16',
    'M20 4c-6 4-6 12 0 16',
  ],
} as const
