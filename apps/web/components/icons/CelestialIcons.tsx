'use client'

/**
 * Custom celestial icon library — sharp, geometric line-art glyphs
 * for all zodiac signs, planets, and special points.
 *
 * Design language: 1.5px stroke, round caps, geometric forms,
 * matching the angular clip-path aesthetic of the app.
 *
 * Usage:
 *   <CelestialIcon name="sun" size={24} />
 *   <SunIcon size={20} className="text-yellow-400" />
 *
 * For D3/Canvas: import { GLYPH_SYMBOL_DEFS } and use <GlyphDefs /> in your SVG.
 */

import React, { type ReactNode } from 'react'

/* ═══════════════════════════════════════════════════════════════
   SHARED SVG PROPS
   ═══════════════════════════════════════════════════════════════ */
interface IconProps {
  size?: number
  className?: string
}

const BASE: React.SVGAttributes<SVGSVGElement> = {
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.5,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
}

function Svg({ size = 24, className, children }: IconProps & { children: ReactNode }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" className={className} {...BASE}>
      {children}
    </svg>
  )
}

/* ═══════════════════════════════════════════════════════════════
   TRADITIONAL ASTROLOGICAL GLYPHS
   Standard symbols used in Western astrology, rendered as SVG
   paths matching the look astrologers and enthusiasts expect.
   ═══════════════════════════════════════════════════════════════ */

/* ── PLANET ICONS ─────────────────────────────────────────────── */

/** ☉ Sun — circle with center dot */
export function SunIcon({ size, className }: IconProps) {
  return (
    <Svg size={size} className={className}>
      <circle cx={12} cy={12} r={7} />
      <circle cx={12} cy={12} r={1.5} fill="currentColor" stroke="none" />
    </Svg>
  )
}

/** ☽ Moon — crescent */
export function MoonIcon({ size, className }: IconProps) {
  return (
    <Svg size={size} className={className}>
      <path d="M18 12a7 7 0 1 1-5-6.7A5.5 5.5 0 0 0 18 12z" />
    </Svg>
  )
}

/** ☿ Mercury — circle + cross below + crescent above */
export function MercuryIcon({ size, className }: IconProps) {
  return (
    <Svg size={size} className={className}>
      <circle cx={12} cy={12} r={3.5} />
      <path d="M12 15.5v5" />
      <path d="M9 18.5h6" />
      <path d="M8.5 7a3.5 2.5 0 0 1 7 0" />
    </Svg>
  )
}

/** ♀ Venus — circle + cross below */
export function VenusIcon({ size, className }: IconProps) {
  return (
    <Svg size={size} className={className}>
      <circle cx={12} cy={9} r={5} />
      <path d="M12 14v7" />
      <path d="M9 18h6" />
    </Svg>
  )
}

/** ♂ Mars — circle + arrow upper-right */
export function MarsIcon({ size, className }: IconProps) {
  return (
    <Svg size={size} className={className}>
      <circle cx={10} cy={14} r={5.5} />
      <path d="M14 10L20 4" />
      <path d="M15 4h5v5" />
    </Svg>
  )
}

/** ♃ Jupiter — stylised 4/2-shape */
export function JupiterIcon({ size, className }: IconProps) {
  return (
    <Svg size={size} className={className}>
      <path d="M5 9c3-5 8-5 10-2" />
      <path d="M4 14h12" />
      <path d="M15 4v16" />
    </Svg>
  )
}

/** ♄ Saturn — cross-topped sickle */
export function SaturnIcon({ size, className }: IconProps) {
  return (
    <Svg size={size} className={className}>
      <path d="M7 3h6" />
      <path d="M10 3v7" />
      <path d="M10 10c4 0 7 2 7 5.5S14 21 10 20" />
    </Svg>
  )
}

/** ♅ Uranus — circle with dot + vertical line + horizontal arms */
export function UranusIcon({ size, className }: IconProps) {
  return (
    <Svg size={size} className={className}>
      <circle cx={12} cy={19} r={2.5} />
      <circle cx={12} cy={19} r={0.8} fill="currentColor" stroke="none" />
      <path d="M12 16.5V5" />
      <path d="M7 5v5" />
      <path d="M17 5v5" />
      <path d="M7 5h10" />
    </Svg>
  )
}

/** ♆ Neptune — trident */
export function NeptuneIcon({ size, className }: IconProps) {
  return (
    <Svg size={size} className={className}>
      <path d="M12 21v-16" />
      <path d="M5 7l7-4 7 4" />
      <path d="M5 7v3" />
      <path d="M19 7v3" />
      <path d="M12 3v2" />
      <path d="M8 16h8" />
    </Svg>
  )
}

/** ♇ Pluto — circle atop arc + cross below */
export function PlutoIcon({ size, className }: IconProps) {
  return (
    <Svg size={size} className={className}>
      <circle cx={12} cy={7} r={3.5} />
      <path d="M6 11a6 4 0 0 1 12 0" />
      <path d="M12 11v7.5" />
      <path d="M9 15.5h6" />
    </Svg>
  )
}

/** ☊ North Node — horseshoe opening upward */
export function NorthNodeIcon({ size, className }: IconProps) {
  return (
    <Svg size={size} className={className}>
      <path d="M6 6a6 6 0 0 1 12 0" />
      <circle cx={6} cy={6} r={2.5} />
      <circle cx={18} cy={6} r={2.5} />
      <path d="M6 8.5v10" />
      <path d="M18 8.5v10" />
    </Svg>
  )
}

/** ASC / Rising — standard "A" glyph */
export function RisingIcon({ size, className }: IconProps) {
  return (
    <Svg size={size} className={className}>
      <path d="M4 20L12 4l8 16" />
      <path d="M7.5 14h9" />
    </Svg>
  )
}

/* ── ZODIAC ICONS ─────────────────────────────────────────────── */

/** ♈ Aries — ram horns */
export function AriesIcon({ size, className }: IconProps) {
  return (
    <Svg size={size} className={className}>
      <path d="M6 20c0-10 0-14 3-17 2-1.5 3 .5 3 3v14" />
      <path d="M18 20c0-10 0-14-3-17-2-1.5-3 .5-3 3" />
    </Svg>
  )
}

/** ♉ Taurus — circle with bull horns */
export function TaurusIcon({ size, className }: IconProps) {
  return (
    <Svg size={size} className={className}>
      <circle cx={12} cy={16} r={5.5} />
      <path d="M4 4c0 4 3.5 6.5 8 6.5s8-2.5 8-6.5" />
    </Svg>
  )
}

/** ♊ Gemini — two pillars */
export function GeminiIcon({ size, className }: IconProps) {
  return (
    <Svg size={size} className={className}>
      <path d="M5 3h14" />
      <path d="M5 21h14" />
      <path d="M8 3c-.5 4-.5 14 0 18" />
      <path d="M16 3c.5 4 .5 14 0 18" />
    </Svg>
  )
}

/** ♋ Cancer — 69-shape / crab claws */
export function CancerIcon({ size, className }: IconProps) {
  return (
    <Svg size={size} className={className}>
      <path d="M4 10c0-5 16-5 16 0" />
      <path d="M20 14c0 5-16 5-16 0" />
      <circle cx={7} cy={10} r={3} />
      <circle cx={17} cy={14} r={3} />
    </Svg>
  )
}

/** ♌ Leo — lion tail + loop */
export function LeoIcon({ size, className }: IconProps) {
  return (
    <Svg size={size} className={className}>
      <circle cx={8} cy={14} r={4.5} />
      <path d="M12.5 14c0-6 3-10 5-10s3 2 3 4-2 4-4 3" />
    </Svg>
  )
}

/** ♍ Virgo — three vertical strokes + crossed tail */
export function VirgoIcon({ size, className }: IconProps) {
  return (
    <Svg size={size} className={className}>
      <path d="M4 20V8c0-3 3-4 4-1v13" />
      <path d="M8 20V8c0-3 3-4 4-1v13" />
      <path d="M12 20V8c0-3 3-4 4-1v5" />
      <path d="M16 12c0 3 2 5 4 4" />
      <path d="M18.5 12l2 6" />
    </Svg>
  )
}

/** ♎ Libra — scales / horizon with setting sun */
export function LibraIcon({ size, className }: IconProps) {
  return (
    <Svg size={size} className={className}>
      <path d="M3 20h18" />
      <path d="M3 15h18" />
      <path d="M7 15a5 5 0 0 1 10 0" />
    </Svg>
  )
}

/** ♏ Scorpio — three strokes + arrow tail */
export function ScorpioIcon({ size, className }: IconProps) {
  return (
    <Svg size={size} className={className}>
      <path d="M4 20V8c0-3 3-4 4-1v13" />
      <path d="M8 20V8c0-3 3-4 4-1v13" />
      <path d="M12 20V8c0-3 3-4 4-1v8c0 3 2 5 4 4" />
      <path d="M18 16l3 3-3 3" />
    </Svg>
  )
}

/** ♐ Sagittarius — arrow diagonal */
export function SagittariusIcon({ size, className }: IconProps) {
  return (
    <Svg size={size} className={className}>
      <path d="M4 20L20 4" />
      <path d="M13 4h7v7" />
      <path d="M7 13l5 5" />
    </Svg>
  )
}

/** ♑ Capricorn — sea-goat */
export function CapricornIcon({ size, className }: IconProps) {
  return (
    <Svg size={size} className={className}>
      <path d="M4 4v8c0 4 3 6 6 6s5-2 5-5V8" />
      <path d="M15 13c0 4 2 7 4 7a2.5 2.5 0 0 0 0-5" />
    </Svg>
  )
}

/** ♒ Aquarius — two wavy lines */
export function AquariusIcon({ size, className }: IconProps) {
  return (
    <Svg size={size} className={className}>
      <path d="M3 9l2.5-3 3 3 3-3 3 3 3-3 2.5 3" />
      <path d="M3 16l2.5-3 3 3 3-3 3 3 3-3 2.5 3" />
    </Svg>
  )
}

/** ♓ Pisces — two arcs with horizontal bar */
export function PiscesIcon({ size, className }: IconProps) {
  return (
    <Svg size={size} className={className}>
      <path d="M4 12h16" />
      <path d="M8 4c-4 4-4 12 0 16" />
      <path d="M16 4c4 4 4 12 0 16" />
    </Svg>
  )
}

/* ═══════════════════════════════════════════════════════════════
   LOOKUP & COMPOSITE COMPONENT
   ═══════════════════════════════════════════════════════════════ */

type CelestialIconName =
  | 'sun' | 'moon' | 'mercury' | 'venus' | 'mars'
  | 'jupiter' | 'saturn' | 'uranus' | 'neptune' | 'pluto' | 'northNode'
  | 'rising'
  | 'aries' | 'taurus' | 'gemini' | 'cancer' | 'leo' | 'virgo'
  | 'libra' | 'scorpio' | 'sagittarius' | 'capricorn' | 'aquarius' | 'pisces'

const ICON_MAP: Record<CelestialIconName, (props: IconProps) => React.JSX.Element> = {
  sun: SunIcon,
  moon: MoonIcon,
  mercury: MercuryIcon,
  venus: VenusIcon,
  mars: MarsIcon,
  jupiter: JupiterIcon,
  saturn: SaturnIcon,
  uranus: UranusIcon,
  neptune: NeptuneIcon,
  pluto: PlutoIcon,
  northNode: NorthNodeIcon,
  rising: RisingIcon,
  aries: AriesIcon,
  taurus: TaurusIcon,
  gemini: GeminiIcon,
  cancer: CancerIcon,
  leo: LeoIcon,
  virgo: VirgoIcon,
  libra: LibraIcon,
  scorpio: ScorpioIcon,
  sagittarius: SagittariusIcon,
  capricorn: CapricornIcon,
  aquarius: AquariusIcon,
  pisces: PiscesIcon,
}

/** Universal icon component — pass any planet/zodiac/special name */
export function CelestialIcon({ name, size = 24, className }: { name: string; size?: number; className?: string }) {
  const Component = ICON_MAP[name as CelestialIconName]
  if (!Component) return <span className={className}>{name}</span>
  return <Component size={size} className={className} />
}

/* ═══════════════════════════════════════════════════════════════
   SVG <defs> for D3/NatalWheel embedding
   Renders <symbol> elements that D3 can reference via <use>.
   ═══════════════════════════════════════════════════════════════ */
export function GlyphDefs() {
  return (
    <defs>
      {(Object.entries(ICON_MAP) as [string, (p: IconProps) => React.JSX.Element][]).map(([name, Component]) => (
        <symbol key={name} id={`glyph-${name}`} viewBox="0 0 24 24">
          <Component />
        </symbol>
      ))}
    </defs>
  )
}
