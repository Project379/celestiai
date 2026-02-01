# Phase 4: Astrology Engine & Charts - Research

**Researched:** 2026-02-01
**Domain:** Swiss Ephemeris calculations, astrology chart visualization
**Confidence:** MEDIUM (verified with official docs and npm packages, some details inferred)

## Summary

Phase 4 implements the core astrology engine using Swiss Ephemeris for server-side calculations and D3.js for interactive chart visualization. The research identified `sweph` as the best Node.js package for Swiss Ephemeris bindings (native, typed, actively maintained), with `@astrodraw/astrochart` as a viable chart rendering library that can be customized or replaced with custom D3.js for full control.

Key findings:
- Swiss Ephemeris calculations run server-side in Next.js API routes using native Node.js bindings (no WASM needed for server)
- Placidus house system uses code 'P' and returns 12 house cusps plus Ascendant/MC/Vertex
- For unknown birth time, use noon (12:00) as default with disclaimer that houses/Ascendant are approximate
- D3.js + React integration uses `useRef` + `useEffect` pattern for direct DOM manipulation
- Aspect calculations are simple degree arithmetic with configurable orbs

**Primary recommendation:** Use `sweph` npm package for server-side calculations, build custom D3.js wheel chart for full styling control to match the glassmorphism design.

## Standard Stack

The established libraries/tools for this domain:

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| sweph | 2.10.3-4 | Swiss Ephemeris Node.js bindings | Native bindings, 100% API coverage, TypeScript support, actively maintained |
| d3 | 7.x | Chart visualization | Industry standard for custom data viz, full control over SVG |
| d3-shape | 3.x | Arc/pie generators | D3 module for circular shapes |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| @astrodraw/astrochart | 3.0.2 | Pre-built natal chart SVG | Quick prototype, but limited customization |
| swisseph-wasm | 0.0.2 | WASM version of Swiss Eph | Only if server-side Node.js bindings fail |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| sweph (native) | swisseph-wasm | WASM adds complexity, native is faster on server |
| Custom D3 chart | @astrodraw/astrochart | Less control over styling, harder to match glassmorphism |
| D3.js | React Native Skia | Skia is mobile-focused; D3 better for web-first |

**Installation:**
```bash
# In packages/astrology
pnpm add sweph

# In apps/web
pnpm add d3 @types/d3
```

## Architecture Patterns

### Recommended Project Structure
```
packages/
  astrology/                    # New package
    src/
      index.ts                  # Public API exports
      calculator.ts             # Core calculation functions
      types.ts                  # TypeScript interfaces
      constants.ts              # Planet/sign constants in Bulgarian
      utils/
        julian-day.ts           # Date to Julian Day conversion
        zodiac.ts               # Longitude to sign conversion
        aspects.ts              # Aspect detection logic

apps/web/
  app/
    api/
      chart/
        calculate/
          route.ts              # POST /api/chart/calculate
    (dashboard)/
      chart/
        page.tsx                # Chart display page
  components/
    chart/
      NatalWheel.tsx            # D3.js wheel chart component
      BigThreeCards.tsx         # Sun/Moon/Rising cards
      PlanetCard.tsx            # Individual planet detail card
      AspectLines.tsx           # Aspect visualization
  hooks/
    useD3.ts                    # D3 + React integration hook
    useChart.ts                 # Chart data fetching hook
```

### Pattern 1: Server-Side Calculation API
**What:** All Swiss Ephemeris calculations run in Next.js API routes
**When to use:** Always - heavy WASM/native calculations must not run client-side
**Example:**
```typescript
// apps/web/app/api/chart/calculate/route.ts
import { auth } from '@clerk/nextjs/server'
import { calculateNatalChart } from '@celestia/astrology'

export async function POST(request: Request) {
  const { userId } = await auth()
  if (!userId) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { birthDate, birthTime, latitude, longitude } = await request.json()

  // All Swiss Ephemeris calls happen server-side
  const chart = await calculateNatalChart({
    date: new Date(birthDate),
    time: birthTime ?? '12:00', // noon if unknown
    lat: latitude,
    lon: longitude,
    houseSystem: 'P', // Placidus
  })

  return Response.json(chart)
}
```

### Pattern 2: D3 + React useRef Integration
**What:** Use `useRef` to give D3 access to DOM, `useEffect` for lifecycle
**When to use:** For all D3 visualizations in React
**Example:**
```typescript
// hooks/useD3.ts
import { useRef, useEffect, DependencyList } from 'react'
import * as d3 from 'd3'

export function useD3<T extends SVGSVGElement>(
  renderFn: (svg: d3.Selection<T, unknown, null, undefined>) => void,
  deps: DependencyList
) {
  const ref = useRef<T>(null)

  useEffect(() => {
    if (!ref.current) return
    renderFn(d3.select(ref.current))
  }, deps)

  return ref
}
```

### Pattern 3: Cached Chart Calculations
**What:** Store calculated chart data in database, only recalculate if birth data changes
**When to use:** After initial chart calculation
**Example:**
```typescript
// Check for cached calculation first
const existingCalc = await supabase
  .from('chart_calculations')
  .select('*')
  .eq('chart_id', chartId)
  .single()

if (existingCalc.data) {
  return existingCalc.data
}

// Calculate and cache
const calculated = await calculateNatalChart(birthData)
await supabase.from('chart_calculations').insert({
  chart_id: chartId,
  planet_positions: calculated.planets,
  house_cusps: calculated.houses,
  aspects: calculated.aspects,
})
```

### Anti-Patterns to Avoid
- **Client-side WASM:** Never load Swiss Ephemeris in browser - it's large and computation-heavy
- **Recalculating on every render:** Cache chart data in database after first calculation
- **Direct D3 DOM manipulation in render:** Always use useEffect, never in component body
- **Hardcoding degree values:** Use constants for aspect degrees and orbs

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Julian Day conversion | Date math | `sweph.julday()` | Edge cases with calendar systems, leap seconds |
| Planet positions | Ephemeris tables | `sweph.calc_ut()` | Years of astronomical refinement, JPL data |
| House cusps | Trig formulas | `sweph.houses()` | Placidus math is complex, polar edge cases |
| SVG arc paths | Manual path strings | `d3.arc()` | Properly handles edge cases, animations |
| Zodiac sign from longitude | Division logic | Utility function | Need to handle 360-wrap, consistency |

**Key insight:** Swiss Ephemeris has been refined for decades by professional astronomers. Any hand-rolled calculation will have bugs that won't surface until edge cases (polar latitudes, date boundaries).

## Common Pitfalls

### Pitfall 1: Timezone Confusion
**What goes wrong:** Birth time interpreted in wrong timezone, chart is hours off
**Why it happens:** JavaScript Date objects auto-convert to local time
**How to avoid:**
- Store birth date/time as UTC in database
- Pass timezone offset explicitly to calculations
- Use Julian Day which is timezone-agnostic
**Warning signs:** Charts calculated at server match, but differ from client expectations

### Pitfall 2: Longitude Sign Convention
**What goes wrong:** Western longitudes (Americas) calculated as Eastern
**Why it happens:** Some libraries expect negative for West, others expect positive
**How to avoid:**
- Swiss Ephemeris: West is negative (e.g., New York is -74.006)
- Always verify with known chart (e.g., your own birth chart)
**Warning signs:** Ascendant is wrong sign, houses are offset

### Pitfall 3: Unknown Birth Time Handling
**What goes wrong:** Houses and Ascendant shown with false precision
**Why it happens:** System calculates with default time but displays as exact
**How to avoid:**
- Use noon (12:00) as default per astrological convention
- Display disclaimer: "Възходящият знак е приблизителен" (Rising sign is approximate)
- Consider hiding houses entirely when time unknown
**Warning signs:** Users complain their Rising sign is wrong

### Pitfall 4: Polar Latitude House Calculation
**What goes wrong:** Placidus houses fail near polar circle
**Why it happens:** Placidus math breaks down when sun doesn't set/rise
**How to avoid:**
- Swiss Ephemeris auto-falls back to Porphyry at polar latitudes
- Detect this condition (check return flag) and inform user
- Bulgaria is at ~42-44N, so not an issue for primary market
**Warning signs:** Error returns for Nordic/Antarctic users

### Pitfall 5: D3 Re-render Performance
**What goes wrong:** Chart re-renders on every state change, janky UI
**Why it happens:** React re-renders trigger D3 to redraw entire SVG
**How to avoid:**
- Memoize chart data with `useMemo`
- Use stable dependency array in useEffect
- Only pass changed data, not entire state
**Warning signs:** Visible flicker when interacting with chart

## swisseph-wasm Integration

### Server-Side Setup (sweph package)

For server-side Node.js, use the native `sweph` package (not WASM):

```typescript
// packages/astrology/src/calculator.ts
import * as sweph from 'sweph'

// Planet constants
const PLANETS = {
  SUN: sweph.SE_SUN,         // 0
  MOON: sweph.SE_MOON,       // 1
  MERCURY: sweph.SE_MERCURY, // 2
  VENUS: sweph.SE_VENUS,     // 3
  MARS: sweph.SE_MARS,       // 4
  JUPITER: sweph.SE_JUPITER, // 5
  SATURN: sweph.SE_SATURN,   // 6
  URANUS: sweph.SE_URANUS,   // 7
  NEPTUNE: sweph.SE_NEPTUNE, // 8
  PLUTO: sweph.SE_PLUTO,     // 9
} as const

// Calculate Julian Day from date/time
function getJulianDay(date: Date, time: string): number {
  const [hours, minutes] = time.split(':').map(Number)
  const decimalHours = hours + minutes / 60

  return sweph.julday(
    date.getUTCFullYear(),
    date.getUTCMonth() + 1, // JS months are 0-indexed
    date.getUTCDate(),
    decimalHours,
    sweph.SE_GREG_CAL
  )
}

// Calculate planet position
function getPlanetPosition(jd: number, planet: number) {
  const result = sweph.calc_ut(jd, planet, sweph.SEFLG_SPEED)
  // result.data = [longitude, latitude, distance, lonSpeed, latSpeed, distSpeed]
  return {
    longitude: result.data[0],
    latitude: result.data[1],
    speed: result.data[3],
  }
}
```

### Ephemeris Files

The `sweph` package includes Moshier ephemeris by default (no external files needed). For higher precision:
- Swiss Ephemeris files (.se1) available from astro.com
- JPL ephemeris for maximum precision (large files)

For this project, **Moshier is sufficient** - accuracy within 1 arc-second, no file dependencies.

```typescript
// Using Moshier (default, no files needed)
const result = sweph.calc_ut(jd, planet, sweph.SEFLG_MOSEPH | sweph.SEFLG_SPEED)

// Using Swiss Ephemeris (requires .se1 files)
// sweph.set_ephe_path('/path/to/ephe')
// const result = sweph.calc_ut(jd, planet, sweph.SEFLG_SWIEPH | sweph.SEFLG_SPEED)
```

## Placidus House Calculation

### API Usage

```typescript
// Calculate houses using Placidus system
function calculateHouses(jd: number, lat: number, lon: number) {
  const result = sweph.houses(jd, lat, lon, 'P') // 'P' = Placidus

  return {
    cusps: result.data.houses, // Array of 12 house cusp longitudes
    ascendant: result.data.points.asc,    // Ascendant longitude
    mc: result.data.points.mc,            // Midheaven longitude
    vertex: result.data.points.vertex,    // Vertex longitude
    armc: result.data.points.armc,        // Sidereal time
  }
}
```

### House System Codes
| Code | System | Notes |
|------|--------|-------|
| 'P' | Placidus | Most common in Western/Bulgarian astrology |
| 'K' | Koch | Popular in German-speaking countries |
| 'C' | Campanus | Used by some modern astrologers |
| 'R' | Regiomontanus | Historical system |
| 'E' | Equal | Simple 30-degree divisions from Ascendant |
| 'W' | Whole Sign | Each sign = one house |

### Ascendant Calculation

The Ascendant (Rising sign) is automatically returned by `swe_houses()`:

```typescript
const houses = sweph.houses(jd, lat, lon, 'P')
const ascendantLongitude = houses.data.points.asc

// Convert to zodiac sign
const risingSign = getZodiacSign(ascendantLongitude)
const risingDegree = ascendantLongitude % 30
```

## D3.js Chart Visualization

### Natal Wheel Structure

A natal chart wheel consists of:
1. **Outer ring:** 12 zodiac sign segments (30 degrees each)
2. **Middle ring:** 12 house divisions (variable sizes with Placidus)
3. **Inner area:** Planet positions with glyphs/icons
4. **Center:** Aspect lines connecting planets

### D3 Arc Generator for Wheel Segments

```typescript
import * as d3 from 'd3'

// Create arc generator for zodiac segments
const zodiacArc = d3.arc()
  .innerRadius(innerRadius)
  .outerRadius(outerRadius)
  .startAngle((d, i) => (i * 30 - 90) * Math.PI / 180) // -90 to start at top
  .endAngle((d, i) => ((i + 1) * 30 - 90) * Math.PI / 180)

// Create arc generator for house segments
const houseArc = d3.arc()
  .innerRadius(houseInnerRadius)
  .outerRadius(houseOuterRadius)
  .startAngle(d => (d.startDegree - 90) * Math.PI / 180)
  .endAngle(d => (d.endDegree - 90) * Math.PI / 180)
```

### Planet Positioning

```typescript
// Convert ecliptic longitude to x,y position on wheel
function planetPosition(longitude: number, radius: number) {
  // Subtract 90 to start Aries at top, negate for clockwise
  const angle = (longitude - 90) * Math.PI / 180
  return {
    x: Math.cos(angle) * radius,
    y: Math.sin(angle) * radius,
  }
}

// Place planets on the wheel
planets.forEach(planet => {
  const pos = planetPosition(planet.longitude, planetRadius)
  svg.append('circle')
    .attr('cx', pos.x)
    .attr('cy', pos.y)
    .attr('r', 8)
    .attr('fill', planetColors[planet.name])
})
```

### Interactive Click/Tap Handling

```typescript
// Add click handlers to planet elements
svg.selectAll('.planet')
  .data(planets)
  .enter()
  .append('g')
  .attr('class', 'planet')
  .on('click', (event, planet) => {
    onPlanetSelect(planet) // Callback to React state
  })
  .style('cursor', 'pointer')
```

## React + D3.js Patterns

### Custom useD3 Hook

```typescript
// hooks/useD3.ts
import { useRef, useEffect, DependencyList } from 'react'
import * as d3 from 'd3'

export function useD3<T extends SVGSVGElement = SVGSVGElement>(
  renderFn: (svg: d3.Selection<T, unknown, null, undefined>) => void,
  deps: DependencyList = []
) {
  const ref = useRef<T>(null)

  useEffect(() => {
    if (!ref.current) return

    // Clear previous content
    d3.select(ref.current).selectAll('*').remove()

    // Render new content
    renderFn(d3.select(ref.current))

    return () => {
      // Cleanup on unmount
      if (ref.current) {
        d3.select(ref.current).selectAll('*').remove()
      }
    }
  }, deps)

  return ref
}
```

### Natal Chart Component Structure

```typescript
// components/chart/NatalWheel.tsx
'use client'

import { useD3 } from '@/hooks/useD3'
import { ChartData } from '@celestia/astrology'

interface NatalWheelProps {
  chart: ChartData
  onPlanetSelect: (planet: PlanetData) => void
  size?: number
}

export function NatalWheel({ chart, onPlanetSelect, size = 600 }: NatalWheelProps) {
  const svgRef = useD3<SVGSVGElement>(
    (svg) => {
      const center = size / 2

      // Draw zodiac ring
      drawZodiacRing(svg, center, size * 0.45, size * 0.48)

      // Draw house divisions
      drawHouses(svg, center, chart.houses, size * 0.35, size * 0.44)

      // Draw aspect lines
      drawAspects(svg, center, chart.aspects, size * 0.30)

      // Draw planets (clickable)
      drawPlanets(svg, center, chart.planets, size * 0.32, onPlanetSelect)
    },
    [chart, size, onPlanetSelect]
  )

  return (
    <svg
      ref={svgRef}
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      className="mx-auto"
    />
  )
}
```

## Data Structures

### Chart Calculation Response

```typescript
// packages/astrology/src/types.ts

export interface PlanetPosition {
  planet: string          // 'sun' | 'moon' | etc.
  longitude: number       // 0-360 degrees
  latitude: number        // Celestial latitude
  speed: number           // Degrees per day (negative = retrograde)
  sign: string            // 'aries' | 'taurus' | etc.
  signDegree: number      // 0-30 within sign
  house: number           // 1-12
}

export interface HouseData {
  number: number          // 1-12
  cuspLongitude: number   // Starting degree
  sign: string            // Sign on cusp
  signDegree: number      // Degree within sign
}

export interface AspectData {
  planet1: string
  planet2: string
  aspect: 'conjunction' | 'sextile' | 'square' | 'trine' | 'opposition'
  angle: number           // Actual angle between planets
  orb: number             // Deviation from exact aspect
  applying: boolean       // Is aspect getting closer?
}

export interface ChartData {
  planets: PlanetPosition[]
  houses: HouseData[]
  aspects: AspectData[]
  ascendant: {
    longitude: number
    sign: string
    degree: number
  }
  mc: {
    longitude: number
    sign: string
    degree: number
  }
  birthTimeKnown: boolean
}
```

### Bulgarian Constants

```typescript
// packages/astrology/src/constants.ts

export const ZODIAC_SIGNS_BG = {
  aries: 'Овен',
  taurus: 'Телец',
  gemini: 'Близнаци',
  cancer: 'Рак',
  leo: 'Лъв',
  virgo: 'Дева',
  libra: 'Везни',
  scorpio: 'Скорпион',
  sagittarius: 'Стрелец',
  capricorn: 'Козирог',
  aquarius: 'Водолей',
  pisces: 'Риби',
} as const

export const PLANETS_BG = {
  sun: 'Слънце',
  moon: 'Луна',
  mercury: 'Меркурий',
  venus: 'Венера',
  mars: 'Марс',
  jupiter: 'Юпитер',
  saturn: 'Сатурн',
  uranus: 'Уран',
  neptune: 'Нептун',
  pluto: 'Плутон',
} as const

export const ASPECTS_BG = {
  conjunction: 'Съвпад',
  sextile: 'Секстил',
  square: 'Квадрат',
  trine: 'Тригон',
  opposition: 'Опозиция',
} as const
```

## Unknown Birth Time Handling

### Noon Chart Convention

When birth time is unknown, the astrological convention is to use **noon (12:00)** as the default:

- Maximum error is +/- 12 hours from the actual time
- Moon position may be off by up to 6-7 degrees (it moves ~12 degrees/day)
- Sun, Mercury, Venus positions are accurate within ~0.5 degrees
- Outer planets (Jupiter-Pluto) are essentially accurate

### Implementation

```typescript
function calculateChart(birthData: BirthInput): ChartData {
  const time = birthData.birthTimeKnown
    ? birthData.birthTime
    : '12:00' // Noon default

  const jd = getJulianDay(birthData.birthDate, time)
  const planets = calculatePlanets(jd)
  const houses = calculateHouses(jd, birthData.lat, birthData.lon)

  return {
    planets,
    houses,
    aspects: calculateAspects(planets),
    ascendant: houses.ascendant,
    mc: houses.mc,
    birthTimeKnown: birthData.birthTimeKnown,
  }
}
```

### UI Disclaimer

When `birthTimeKnown === false`, display:
- Bulgarian: "Часът на раждане е неизвестен. Възходящият знак и домовете са приблизителни."
- English: "Birth time unknown. Rising sign and houses are approximate."

Consider visually de-emphasizing or hiding:
- Ascendant/Rising sign (or show with "~" prefix)
- House placements
- House-based aspects

## Aspect Calculations

### Standard Aspect Definitions

| Aspect | Degrees | Standard Orb | Nature |
|--------|---------|--------------|--------|
| Conjunction | 0 | 8-10 | Powerful, blending |
| Sextile | 60 | 4-6 | Harmonious, opportunity |
| Square | 90 | 6-8 | Challenging, tension |
| Trine | 120 | 6-8 | Harmonious, flowing |
| Opposition | 180 | 8-10 | Polarity, awareness |

### Aspect Detection Algorithm

```typescript
const ASPECT_DEFINITIONS = [
  { name: 'conjunction', angle: 0, orb: 8 },
  { name: 'sextile', angle: 60, orb: 5 },
  { name: 'square', angle: 90, orb: 7 },
  { name: 'trine', angle: 120, orb: 7 },
  { name: 'opposition', angle: 180, orb: 8 },
]

function calculateAspects(planets: PlanetPosition[]): AspectData[] {
  const aspects: AspectData[] = []

  for (let i = 0; i < planets.length; i++) {
    for (let j = i + 1; j < planets.length; j++) {
      const p1 = planets[i]
      const p2 = planets[j]

      // Calculate shortest angle between planets
      let diff = Math.abs(p1.longitude - p2.longitude)
      if (diff > 180) diff = 360 - diff

      // Check against each aspect type
      for (const aspect of ASPECT_DEFINITIONS) {
        const orb = Math.abs(diff - aspect.angle)
        if (orb <= aspect.orb) {
          aspects.push({
            planet1: p1.planet,
            planet2: p2.planet,
            aspect: aspect.name as AspectData['aspect'],
            angle: diff,
            orb,
            applying: isApplying(p1, p2, aspect.angle),
          })
          break // Only one aspect per planet pair
        }
      }
    }
  }

  return aspects
}

function isApplying(p1: PlanetPosition, p2: PlanetPosition, exactAngle: number): boolean {
  // Compare current orb with orb one day ago (using speeds)
  const currentOrb = Math.abs(
    Math.abs(p1.longitude - p2.longitude) - exactAngle
  )
  const futureOrb = Math.abs(
    Math.abs((p1.longitude + p1.speed) - (p2.longitude + p2.speed)) - exactAngle
  )
  return futureOrb < currentOrb
}
```

## Key Decisions

Based on research findings, these decisions are recommended:

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Swiss Ephemeris package | `sweph` (native) | TypeScript support, active maintenance, no file dependencies with Moshier |
| Ephemeris precision | Moshier (built-in) | Sufficient accuracy, no external files needed |
| House system | Placidus ('P') | Standard in Western/Bulgarian astrology per CONTEXT.md |
| Chart rendering | Custom D3.js | Full control for glassmorphism styling, interactive click handling |
| Unknown time default | 12:00 noon | Astrological convention, minimizes maximum error |
| Aspect orbs | Standard (6-10 degrees) | Balanced precision, covers major aspects |
| Data caching | Database storage | Calculate once, serve many times |
| Tropical zodiac | Yes (default) | Western astrology standard, no ayanamsa needed |

## Open Questions

Things that couldn't be fully resolved:

1. **Exact planet glyph rendering approach**
   - What we know: Can use SVG icons, Unicode symbols, or custom paths
   - What's unclear: Whether Unicode astrology symbols render consistently across browsers
   - Recommendation: Use SVG icons for reliability, Bulgarian text labels as fallback

2. **Mobile touch target size for planets**
   - What we know: Apple recommends 44x44pt minimum touch targets
   - What's unclear: How to prevent overlap when planets are conjunct
   - Recommendation: Implement collision detection to offset overlapping planets

3. **Aspect line visibility with many aspects**
   - What we know: A chart can have 20+ aspects, lines can become cluttered
   - What's unclear: Best UX for showing/hiding aspect lines
   - Recommendation: Show only major aspects (conjunction, square, trine, opposition) by default

## Sources

### Primary (HIGH confidence)
- [sweph npm package](https://www.npmjs.com/package/sweph) - Version, API patterns
- [Swiss Ephemeris documentation](https://www.astro.com/swisseph/swephprg.htm) - Official API reference
- [D3.js official documentation](https://d3js.org/) - Arc generators, selections

### Secondary (MEDIUM confidence)
- [timotejroiko/sweph GitHub](https://github.com/timotejroiko/sweph) - TypeScript types, examples
- [D3 Graph Gallery - Circular Charts](https://d3-graph-gallery.com/circular_barplot.html) - Arc patterns
- [React + D3 integration patterns](https://medium.com/@jeffbutsch/using-d3-in-react-with-hooks-4a6c61f1d102) - useRef pattern

### Tertiary (LOW confidence)
- [@astrodraw/astrochart](https://www.npmjs.com/package/@astrodraw/astrochart) - Alternative chart library
- [CircularNatalHoroscopeJS](https://github.com/0xStarcat/CircularNatalHoroscopeJS) - JS calculation reference
- [Wikipedia - Astrological aspects](https://en.wikipedia.org/wiki/Astrological_aspect) - Aspect definitions/orbs

## Metadata

**Confidence breakdown:**
- Standard stack: MEDIUM - sweph is verified, D3 integration patterns are established
- Architecture: MEDIUM - Based on Next.js API patterns already in codebase
- Pitfalls: MEDIUM - Common issues documented, but real-world edge cases may surface
- Data structures: HIGH - Based on Swiss Ephemeris return values and standard astrology data

**Research date:** 2026-02-01
**Valid until:** 2026-03-01 (30 days - stable domain, libraries change slowly)
