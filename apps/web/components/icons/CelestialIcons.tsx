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
   PLANET ICONS
   ═══════════════════════════════════════════════════════════════ */

export function SunIcon({ size, className }: IconProps) {
  return (
    <Svg size={size} className={className}>
      <circle cx={12} cy={12} r={4.5} />
      <circle cx={12} cy={12} r={1.2} fill="currentColor" stroke="none" />
      <path d="M12 2.5v3M12 18.5v3M2.5 12h3M18.5 12h3" />
      <path d="M5.6 5.6l2.2 2.2M16.2 16.2l2.2 2.2M18.4 5.6l-2.2 2.2M7.8 16.2l-2.2 2.2" />
    </Svg>
  )
}

export function MoonIcon({ size, className }: IconProps) {
  return (
    <Svg size={size} className={className}>
      <path d="M20 14.5A9 9 0 1 1 9.5 4a7.5 7.5 0 0 0 10.5 10.5z" />
    </Svg>
  )
}

export function MercuryIcon({ size, className }: IconProps) {
  return (
    <Svg size={size} className={className}>
      <circle cx={12} cy={11.5} r={3.5} />
      <path d="M8 5.5a4 3 0 0 1 8 0" />
      <path d="M12 8V5.5" />
      <path d="M12 15v5.5" />
      <path d="M9 18h6" />
    </Svg>
  )
}

export function VenusIcon({ size, className }: IconProps) {
  return (
    <Svg size={size} className={className}>
      <circle cx={12} cy={9.5} r={5} />
      <path d="M12 14.5v7" />
      <path d="M8.5 18h7" />
    </Svg>
  )
}

export function MarsIcon({ size, className }: IconProps) {
  return (
    <Svg size={size} className={className}>
      <circle cx={10} cy={14} r={5} />
      <path d="M14.5 9.5L20 4" />
      <path d="M15 4h5v5" />
    </Svg>
  )
}

export function JupiterIcon({ size, className }: IconProps) {
  return (
    <Svg size={size} className={className}>
      <path d="M4 12h13" />
      <path d="M15 5v14" />
      <path d="M4 12C4 6 9 4 15 6" />
    </Svg>
  )
}

export function SaturnIcon({ size, className }: IconProps) {
  return (
    <Svg size={size} className={className}>
      <path d="M9 3v8" />
      <path d="M6 5.5h6" />
      <path d="M9 11c0 0 7 0 7 5.5s-5 5.5-8 4" />
    </Svg>
  )
}

export function UranusIcon({ size, className }: IconProps) {
  return (
    <Svg size={size} className={className}>
      <circle cx={12} cy={17} r={3.5} />
      <path d="M12 13.5V4" />
      <path d="M8 7h8" />
      <circle cx={12} cy={4} r={1.2} fill="currentColor" stroke="none" />
    </Svg>
  )
}

export function NeptuneIcon({ size, className }: IconProps) {
  return (
    <Svg size={size} className={className}>
      <path d="M12 21v-16" />
      <path d="M6 8.5a6 5 0 0 1 12 0" />
      <path d="M6 5v5M12 3v5M18 5v5" />
      <path d="M8 18h8" />
    </Svg>
  )
}

export function PlutoIcon({ size, className }: IconProps) {
  return (
    <Svg size={size} className={className}>
      <path d="M7 9a5 5 0 0 1 10 0" />
      <circle cx={12} cy={14} r={3.5} />
      <path d="M12 17.5v4" />
      <path d="M9 20h6" />
    </Svg>
  )
}

export function NorthNodeIcon({ size, className }: IconProps) {
  return (
    <Svg size={size} className={className}>
      <path d="M5 9a7 7 0 0 1 14 0" />
      <circle cx={7} cy={17} r={3} />
      <circle cx={17} cy={17} r={3} />
      <path d="M5 9v5M19 9v5" />
    </Svg>
  )
}

export function RisingIcon({ size, className }: IconProps) {
  return (
    <Svg size={size} className={className}>
      <path d="M4 20L12 4l8 16" />
      <path d="M7.5 13h9" />
    </Svg>
  )
}

/* ═══════════════════════════════════════════════════════════════
   ZODIAC ICONS
   ═══════════════════════════════════════════════════════════════ */

export function AriesIcon({ size, className }: IconProps) {
  return (
    <Svg size={size} className={className}>
      <path d="M5 20C5 12 5 8 9 4c2-2 3 0 3 3v13" />
      <path d="M19 20c0-8 0-12-4-16-2-2-3 0-3 3" />
    </Svg>
  )
}

export function TaurusIcon({ size, className }: IconProps) {
  return (
    <Svg size={size} className={className}>
      <circle cx={12} cy={16} r={5} />
      <path d="M4 4c0 4 3.5 7 8 7s8-3 8-7" />
    </Svg>
  )
}

export function GeminiIcon({ size, className }: IconProps) {
  return (
    <Svg size={size} className={className}>
      <path d="M5 4h14" />
      <path d="M5 20h14" />
      <path d="M8 4c0 0-1 8 0 16" />
      <path d="M16 4c0 0 1 8 0 16" />
    </Svg>
  )
}

export function CancerIcon({ size, className }: IconProps) {
  return (
    <Svg size={size} className={className}>
      <path d="M4 10a8 8 0 0 1 16 0" />
      <path d="M20 14a8 8 0 0 1-16 0" />
      <circle cx={8} cy={10} r={2.5} fill="currentColor" stroke="none" />
      <circle cx={16} cy={14} r={2.5} fill="currentColor" stroke="none" />
    </Svg>
  )
}

export function LeoIcon({ size, className }: IconProps) {
  return (
    <Svg size={size} className={className}>
      <circle cx={8} cy={9} r={4} />
      <path d="M12 9c0 0 4 0 6 3s1 7-2 8" />
      <circle cx={18} cy={20} r={1.5} fill="currentColor" stroke="none" />
    </Svg>
  )
}

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

export function LibraIcon({ size, className }: IconProps) {
  return (
    <Svg size={size} className={className}>
      <path d="M4 20h16" />
      <path d="M4 15h16" />
      <path d="M7 15a5 5 0 0 1 10 0" />
    </Svg>
  )
}

export function ScorpioIcon({ size, className }: IconProps) {
  return (
    <Svg size={size} className={className}>
      <path d="M4 20V8c0-3 3-4 4-1v13" />
      <path d="M8 20V8c0-3 3-4 4-1v13" />
      <path d="M12 20V8c0-3 3-4 4-1v8c0 3 2 5 4 4" />
      <path d="M18 17l3 3M18 22l3-2.5" />
    </Svg>
  )
}

export function SagittariusIcon({ size, className }: IconProps) {
  return (
    <Svg size={size} className={className}>
      <path d="M4 20L20 4" />
      <path d="M13 4h7v7" />
      <path d="M7.5 12.5l6 6" />
    </Svg>
  )
}

export function CapricornIcon({ size, className }: IconProps) {
  return (
    <Svg size={size} className={className}>
      <path d="M4 4l4 10c0 0 1 4 4 4s4-2 4-5" />
      <path d="M16 13c0 4 2 7 4 7" />
      <circle cx={20} cy={20} r={1.5} fill="none" />
    </Svg>
  )
}

export function AquariusIcon({ size, className }: IconProps) {
  return (
    <Svg size={size} className={className}>
      <path d="M3 9l3-3 3 3 3-3 3 3 3-3 3 3" />
      <path d="M3 16l3-3 3 3 3-3 3 3 3-3 3 3" />
    </Svg>
  )
}

export function PiscesIcon({ size, className }: IconProps) {
  return (
    <Svg size={size} className={className}>
      <path d="M4 12h16" />
      <path d="M8 4a8 8.5 0 0 0 0 16" />
      <path d="M16 4a8 8.5 0 0 1 0 16" />
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
