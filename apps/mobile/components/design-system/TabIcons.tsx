import Svg, { Circle, Path } from 'react-native-svg'

// MOBILE-ALPHA-REDESIGN v3 — tab bar icon fix (Round A follow-up). Custom
// SVG matching the app's existing celestial glyph language (MoonGlyph,
// SunSigil, web's CelestialIcons.tsx) rather than a new icon-library
// dependency, per Conservative SDK defaults. Stroke width is tuned for
// 20-28px tab-bar scale specifically — thicker than the hero-scale glyphs,
// which turn to mush at this size. Founder-reviewed at real scale before
// wiring in (see .planning/research/MOBILE_ALPHA_REDESIGN.md §14).
//
// Self-evidence tradeoffs, accepted deliberately rather than assumed away:
// - Кръг (two overlapping circles) reads as "people/connection" via the
//   standard Venn convention, not as astrology specifically — still the
//   most universally legible option tried.
// - Ритъм (pulse/EKG wave) was picked over an orbit-ellipse because
//   "transits" has no universal glyph; a pulse line reads as "activity"
//   on sight where an orbit doesn't.
// - Ти uses a plain person silhouette, not the Rising/Ascendant
//   astrological glyph — the one tab where instant recognition should
//   outrank astrological purity.

interface TabIconProps {
  color: string
  size?: number
}

const STROKE_WIDTH = 1.7

export function SunTabIcon({ color, size = 24 }: TabIconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={STROKE_WIDTH} strokeLinecap="round" strokeLinejoin="round">
      <Circle cx={12} cy={12} r={4.2} />
      <Path d="M12 3v2.4M12 18.6V21M21 12h-2.4M5.4 12H3M18.2 5.8l-1.7 1.7M7.5 16.5l-1.7 1.7M18.2 18.2l-1.7-1.7M7.5 7.5L5.8 5.8" />
    </Svg>
  )
}

export function WheelTabIcon({ color, size = 24 }: TabIconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={STROKE_WIDTH} strokeLinecap="round" strokeLinejoin="round">
      <Circle cx={12} cy={12} r={8} />
      <Path d="M4 12h16M12 4v2M12 18v2M20 12h-2M4 12h2" />
    </Svg>
  )
}

export function CircleTabIcon({ color, size = 24 }: TabIconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={STROKE_WIDTH} strokeLinecap="round" strokeLinejoin="round">
      <Circle cx={9} cy={12} r={6} />
      <Circle cx={15} cy={12} r={6} />
    </Svg>
  )
}

export function PulseTabIcon({ color, size = 24 }: TabIconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={STROKE_WIDTH} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M2.5 12h4l2-6 3 12 2.5-9 1.5 3h6.5" />
    </Svg>
  )
}

export function PersonTabIcon({ color, size = 24 }: TabIconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={STROKE_WIDTH} strokeLinecap="round" strokeLinejoin="round">
      <Circle cx={12} cy={7.6} r={3.6} />
      <Path d="M4.5 20c0-4.4 3.4-7 7.5-7s7.5 2.6 7.5 7" />
    </Svg>
  )
}
