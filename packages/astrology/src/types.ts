/**
 * Astrology calculation types for @celestia/astrology
 *
 * These types represent the data structures used for natal chart calculations
 * using Swiss Ephemeris.
 */

/**
 * Planet position data from Swiss Ephemeris calculation
 */
export interface PlanetPosition {
  /** Planet identifier (lowercase): 'sun', 'moon', 'mercury', etc. */
  planet: string
  /** Ecliptic longitude in degrees (0-360) */
  longitude: number
  /** Celestial latitude in degrees */
  latitude: number
  /** Daily motion in degrees (negative = retrograde) */
  speed: number
  /** Zodiac sign (lowercase): 'aries', 'taurus', etc. */
  sign: string
  /** Degree within sign (0-30) */
  signDegree: number
  /** House placement (1-12) */
  house: number
}

/**
 * House cusp data from Placidus calculation
 */
export interface HouseData {
  /** House number (1-12) */
  number: number
  /** Cusp longitude in degrees (0-360) */
  cuspLongitude: number
  /** Sign on cusp (lowercase) */
  sign: string
  /** Degree within sign (0-30) */
  signDegree: number
}

/**
 * Aspect data between two planets
 */
export interface AspectData {
  /** First planet (lowercase) */
  planet1: string
  /** Second planet (lowercase) */
  planet2: string
  /** Aspect type */
  aspect: 'conjunction' | 'sextile' | 'square' | 'trine' | 'opposition'
  /** Actual angle between planets in degrees */
  angle: number
  /** Deviation from exact aspect in degrees */
  orb: number
  /** Is aspect applying (getting closer)? */
  applying: boolean
}

/**
 * Point data (Ascendant, MC, etc.)
 */
export interface PointData {
  /** Ecliptic longitude in degrees (0-360) */
  longitude: number
  /** Zodiac sign (lowercase) */
  sign: string
  /** Degree within sign (0-30) */
  degree: number
}

/**
 * Complete natal chart calculation result
 */
export interface ChartData {
  /** All 10 major planet positions */
  planets: PlanetPosition[]
  /** 12 house cusps */
  houses: HouseData[]
  /** Detected aspects between planets */
  aspects: AspectData[]
  /** Ascendant (Rising sign) */
  ascendant: PointData
  /** Midheaven (MC) */
  mc: PointData
  /** Whether birth time was known (affects house/ascendant accuracy) */
  birthTimeKnown: boolean
}

/**
 * Input for chart calculation
 */
export interface ChartInput {
  /** Birth date (UTC) */
  date: Date
  /** Birth time in HH:MM format, or null if unknown */
  time: string | null
  /** Birth location latitude (negative for South) */
  lat: number
  /** Birth location longitude (negative for West) */
  lon: number
  /** Whether the birth time is known */
  birthTimeKnown: boolean
}

/**
 * Zodiac sign identifier (lowercase English)
 */
export type ZodiacSign =
  | 'aries'
  | 'taurus'
  | 'gemini'
  | 'cancer'
  | 'leo'
  | 'virgo'
  | 'libra'
  | 'scorpio'
  | 'sagittarius'
  | 'capricorn'
  | 'aquarius'
  | 'pisces'

/**
 * Planet identifier (lowercase English)
 */
export type Planet =
  | 'sun'
  | 'moon'
  | 'mercury'
  | 'venus'
  | 'mars'
  | 'jupiter'
  | 'saturn'
  | 'uranus'
  | 'neptune'
  | 'pluto'

/**
 * Aspect type identifier
 */
export type AspectType =
  | 'conjunction'
  | 'sextile'
  | 'square'
  | 'trine'
  | 'opposition'
