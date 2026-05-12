import Svg, { Circle, Defs, Ellipse, Path, RadialGradient, Stop } from 'react-native-svg'

interface MoonDiscProps {
  phaseFraction: number // 0 → 1
  size: number
}

/**
 * Phase-aware moon disc rendered as inline SVG. Mobile port of
 * apps/web/components/dashboard/LunarPhaseCard.tsx:339-396 (P.3-b).
 *
 * Geometry mirrors the web implementation: outer glow, dark moon base,
 * lit semicircle (right when waxing, left when waning), ellipse mask that
 * carves the terminator. Crescent phases (<0.25 or ≥0.75) use the dark
 * fill for the ellipse so the lit area appears as a thin crescent.
 */
export function MoonDisc({ phaseFraction, size }: MoonDiscProps) {
  const r = size / 2
  const rx = Math.round(Math.abs(Math.cos(2 * Math.PI * phaseFraction)) * r * 100) / 100
  const isWaxing = phaseFraction < 0.5
  const isCrescent = phaseFraction < 0.25 || phaseFraction >= 0.75

  const gradId = `moon-lit-${size}`
  const glowId = `moon-glow-${size}`
  const litFill = `url(#${gradId})`
  const darkFill = '#0d0b18'

  const rightSemi = `M 0,${-r} A ${r},${r} 0 0 1 0,${r} Z`
  const leftSemi = `M 0,${-r} A ${r},${r} 0 0 0 0,${r} Z`

  return (
    <Svg
      width={size}
      height={size}
      viewBox={`${-size / 2 - 10} ${-size / 2 - 10} ${size + 20} ${size + 20}`}
    >
      <Defs>
        <RadialGradient id={gradId} cx="52%" cy="42%" rx="62%" ry="62%">
          <Stop offset="0%" stopColor="#fef3c7" />
          <Stop offset="55%" stopColor="#f5e6c8" />
          <Stop offset="100%" stopColor="#d4b97f" />
        </RadialGradient>
        <RadialGradient id={glowId} cx="50%" cy="50%" rx="50%" ry="50%">
          <Stop offset="0%" stopColor="rgba(251, 191, 36, 0.38)" />
          <Stop offset="60%" stopColor="rgba(251, 191, 36, 0.08)" />
          <Stop offset="100%" stopColor="rgba(251, 191, 36, 0)" />
        </RadialGradient>
      </Defs>

      <Circle cx="0" cy="0" r={r + 7} fill={`url(#${glowId})`} />
      <Circle cx="0" cy="0" r={r} fill={darkFill} />
      <Path d={isWaxing ? rightSemi : leftSemi} fill={litFill} />
      <Ellipse
        cx="0"
        cy="0"
        rx={rx}
        ry={r}
        fill={isCrescent ? darkFill : litFill}
      />
      <Circle
        cx="0"
        cy="0"
        r={r}
        fill="none"
        stroke="rgba(226, 232, 240, 0.18)"
        strokeWidth="0.7"
      />
    </Svg>
  )
}
