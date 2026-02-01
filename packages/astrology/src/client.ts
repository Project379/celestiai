/**
 * Client-safe exports from @celestia/astrology
 *
 * These exports contain only types and constants that are safe to use
 * in client-side React components. They do not include any server-side
 * dependencies like sweph (Swiss Ephemeris).
 *
 * @example
 * ```typescript
 * // In a 'use client' component:
 * import { ZODIAC_SIGNS_BG, PLANETS_BG } from '@celestia/astrology/client'
 * import type { ChartData, PlanetPosition } from '@celestia/astrology/client'
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
  DEFAULT_UNKNOWN_TIME,
  HOUSE_SYSTEM_PLACIDUS,
  PLANET_IDS,
  PLANETS_BG,
  PLANETS_ORDER,
  UNKNOWN_TIME_DISCLAIMER_BG,
  ZODIAC_SIGNS_BG,
  ZODIAC_SIGNS_ORDER,
} from './constants'
export type { AspectDefinition } from './constants'
