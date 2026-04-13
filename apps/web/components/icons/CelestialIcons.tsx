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
      <circle cx={12} cy={12} r={6} />
      <circle cx={12} cy={12} r={1.2} fill="currentColor" stroke="none" />
    </Svg>
  )
}

/** ☽ Moon — crescent */
export function MoonIcon({ size, className }: IconProps) {
  return (
    <Svg size={size} className={className}>
      <path d="M15 4 A 8 8 0 0 0 15 20 A 6.5 6.5 0 0 1 15 4 Z" />
    </Svg>
  )
}

/** ☿ Mercury — circle + cross below + crescent horns above */
export function MercuryIcon({ size, className }: IconProps) {
  return (
    <Svg size={size} className={className}>
      <circle cx={12} cy={12} r={3.5} />
      <path d="M12 15.5V21" />
      <path d="M9.5 18h5" />
      <path d="M7 5 C 7 9.5, 17 9.5, 17 5" />
    </Svg>
  )
}

/** ♀ Venus — circle + cross below */
export function VenusIcon({ size, className }: IconProps) {
  return (
    <Svg size={size} className={className}>
      <circle cx={12} cy={8.5} r={5} />
      <path d="M12 13.5v7.5" />
      <path d="M9 17.5h6" />
    </Svg>
  )
}

/** ♂ Mars — circle + arrow upper-right */
export function MarsIcon({ size, className }: IconProps) {
  return (
    <Svg size={size} className={className}>
      <circle cx={9.5} cy={14.5} r={5} />
      <path d="M13.5 10.5L20 4" />
      <path d="M15 4h5v5" />
    </Svg>
  )
}

/** ♃ Jupiter — "2" shape with vertical bar */
export function JupiterIcon({ size, className }: IconProps) {
  return (
    <Svg size={size} className={className}>
      <path d="M5.5 7.5 C 5.5 1.5, 13.5 1.5, 13.5 7.5 C 13.5 12, 6 13.5, 6 15 H 17" />
      <path d="M14 10V21" />
    </Svg>
  )
}

/** ♄ Saturn — cross on top + sickle curve */
export function SaturnIcon({ size, className }: IconProps) {
  return (
    <Svg size={size} className={className}>
      <path d="M7 4h6" />
      <path d="M10 4v6" />
      <path d="M10 10c5 0 8 2 8 5s-3 5.5-7 5c-2-.3-3-1.5-3-3" />
    </Svg>
  )
}

/** ♅ Uranus — H-shape with circle at bottom */
export function UranusIcon({ size, className }: IconProps) {
  return (
    <Svg size={size} className={className}>
      <circle cx={12} cy={20} r={2} />
      <path d="M12 18V4" />
      <path d="M7 10h10" />
      <path d="M4 4 C 8 4, 8 16, 4 16" />
      <path d="M20 4 C 16 4, 16 16, 20 16" />
    </Svg>
  )
}

/** ♆ Neptune — trident (ψ shape) + cross below */
export function NeptuneIcon({ size, className }: IconProps) {
  return (
    <Svg size={size} className={className}>
      <path d="M12 21V5" />
      <path d="M5 5c0 6 7 8 7 8" />
      <path d="M19 5c0 6-7 8-7 8" />
      <path d="M8 17h8" />
    </Svg>
  )
}

/** ♇ Pluto — circle sitting in cup + cross below */
export function PlutoIcon({ size, className }: IconProps) {
  return (
    <Svg size={size} className={className}>
      <circle cx={12} cy={6} r={2.5} />
      <path d="M7 5v2 a 5 5 0 0 0 10 0V5" />
      <path d="M12 12v8" />
      <path d="M9 16h6" />
    </Svg>
  )
}

/** ☊ North Node — Ω shape (horseshoe up + legs down) */
export function NorthNodeIcon({ size, className }: IconProps) {
  return (
    <Svg size={size} className={className}>
      <path d="M4 18V10a8 8 0 0 1 16 0v8" />
      <circle cx={4} cy={19} r={2} />
      <circle cx={20} cy={19} r={2} />
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

/** ♈ Aries — V stem with small inward half-circles at each tip */
export function AriesIcon({ size, className }: IconProps) {
  return (
    <Svg size={size} className={className}>
      {/* Stem + left arm + small half-circle curling inward */}
      <path d="M12 21V13L4 6C1 6 1 11 4 11" />
      {/* Right arm + small half-circle curling outward */}
      <path d="M12 13L20 6C23 6 23 11 20 11" />
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

/** ♑ Capricorn — Handwritten n with top-left stroke and outer overlapping loop ending inwards */
export function CapricornIcon({ size, className }: IconProps) {
  return (
    <Svg size={size} className={className}>
      <path d="M 5.5 8 Q 7 7 8.5 9 L 8.5 16" />
      <path d="M 8.5 9 C 8.5 4 14.5 4 14.5 9 V 15 C 14.5 18.5 19.5 20.5 19.5 16 C 19.5 11.5 13.5 11.5 13.5 16 C 13.5 20.5 11.5 21.5 10.5 20.5" />
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
      <path d="M4 4c6 4 6 12 0 16" />
      <path d="M20 4c-6 4-6 12 0 16" />
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
