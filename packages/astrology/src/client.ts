/**
 * Client-safe exports from @stellaeum/astrology
 *
 * These exports contain only types and constants that are safe to use
 * in client-side React components. They do not include any server-side
 * dependencies like sweph (Swiss Ephemeris).
 *
 * @example
 * ```typescript
 * // In a 'use client' component:
 * import { ZODIAC_SIGNS_BG, PLANETS_BG } from '@stellaeum/astrology/client'
 * import type { ChartData, PlanetPosition } from '@stellaeum/astrology/client'
 * ```
 */

// Types
export type {
  AspectData,
  AspectType,
  ChartData,
  ChartInput,
  HouseData,
  Planet,
  PlanetPosition,
  PointData,
  ZodiacSign,
} from './types'

// Constants
export {
  ASPECT_DEFINITIONS,
  ASPECTS_BG,
  ASPECTS_BG_GENDER,
  DEFAULT_UNKNOWN_TIME,
  HOUSE_SYSTEM_PLACIDUS,
  PLANET_GLYPHS,
  PLANET_IDS,
  PLANETS_BG,
  PLANETS_BG_GENDER,
  PLANETS_ORDER,
  UNKNOWN_TIME_DISCLAIMER_BG,
  ZODIAC_GLYPHS,
  ZODIAC_SIGNS_BG,
  ZODIAC_SIGNS_ORDER,
} from './constants'
export type { AspectDefinition } from './constants'
