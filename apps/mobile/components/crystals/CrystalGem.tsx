import Svg, {
  Circle,
  Defs,
  Ellipse,
  G,
  Line,
  LinearGradient,
  Path,
  RadialGradient,
  Stop,
} from 'react-native-svg'

/**
 * Procedural SVG crystal renderer. Mobile port of
 * apps/web/components/crystals/CrystalGem.tsx (geometry ported verbatim —
 * paths/gradients are 1:1 with the web variant since react-native-svg
 * mirrors the SVG spec).
 *
 * Simplified vs web: the SVG `<filter>` glow (feGaussianBlur + feMerge) is
 * dropped — react-native-svg's filter-primitive support is inconsistent
 * across platforms, and ambient glow elsewhere in the mobile app
 * already uses the RadialGradient-fade pattern (see StoriesContent.tsx)
 * rather than blur filters. `glow` renders as a soft unblurred circle.
 */
export type GemVariant = 'cluster' | 'tumbled' | 'point' | 'sphere' | 'raw'

interface CrystalGemProps {
  variant: GemVariant
  primary: string
  secondary: string
  accent?: string | null
  size?: number
  glow?: boolean
  seed?: string
}

function hashSeed(seed: string): number {
  let h = 0
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) | 0
  return Math.abs(h)
}

function lighten(hex: string): string {
  const clean = hex.replace('#', '')
  if (clean.length !== 6) return '#ffffff'
  const r = Math.min(255, parseInt(clean.slice(0, 2), 16) + 48)
  const g = Math.min(255, parseInt(clean.slice(2, 4), 16) + 48)
  const b = Math.min(255, parseInt(clean.slice(4, 6), 16) + 48)
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`
}

export function CrystalGem({
  variant,
  primary,
  secondary,
  accent,
  size = 128,
  glow = true,
  seed = 'default',
}: CrystalGemProps) {
  const gradId = `gem-grad-${variant}-${hashSeed(seed + primary)}`
  const facetId = `gem-facet-${variant}-${hashSeed(seed + primary)}`
  const highlight = accent ?? lighten(primary)

  return (
    <Svg viewBox="0 0 120 120" width={size} height={size}>
      <Defs>
        <RadialGradient id={gradId} cx="35%" cy="30%" r="78%">
          <Stop offset="0%" stopColor={highlight} stopOpacity={1} />
          <Stop offset="45%" stopColor={primary} stopOpacity={1} />
          <Stop offset="100%" stopColor={secondary} stopOpacity={1} />
        </RadialGradient>
        <LinearGradient id={facetId} x1="0%" y1="0%" x2="100%" y2="100%">
          <Stop offset="0%" stopColor="#ffffff" stopOpacity={0.38} />
          <Stop offset="50%" stopColor="#ffffff" stopOpacity={0.02} />
          <Stop offset="100%" stopColor="#000000" stopOpacity={0.28} />
        </LinearGradient>
      </Defs>

      {glow && <Circle cx={60} cy={60} r={54} fill={primary} opacity={0.12} />}

      <G>
        {variant === 'sphere' && (
          <SphereGem gradId={gradId} facetId={facetId} highlight={highlight} primary={primary} />
        )}
        {variant === 'tumbled' && (
          <TumbledGem gradId={gradId} facetId={facetId} highlight={highlight} />
        )}
        {variant === 'point' && (
          <PointGem gradId={gradId} facetId={facetId} highlight={highlight} secondary={secondary} />
        )}
        {variant === 'cluster' && (
          <ClusterGem gradId={gradId} facetId={facetId} secondary={secondary} />
        )}
        {variant === 'raw' && (
          <RawGem gradId={gradId} facetId={facetId} highlight={highlight} secondary={secondary} />
        )}
      </G>
    </Svg>
  )
}

function SphereGem({
  gradId,
  facetId,
  highlight,
  primary,
}: {
  gradId: string
  facetId: string
  highlight: string
  primary: string
}) {
  return (
    <G>
      <Circle cx={60} cy={62} r={44} fill={primary} opacity={0.4} />
      <Circle cx={60} cy={60} r={44} fill={`url(#${gradId})`} />
      <Circle cx={60} cy={60} r={44} fill={`url(#${facetId})`} />
      <Ellipse cx={46} cy={44} rx={14} ry={9} fill={highlight} opacity={0.55} />
      <Ellipse cx={72} cy={78} rx={9} ry={5} fill="#ffffff" opacity={0.08} />
    </G>
  )
}

function TumbledGem({
  gradId,
  facetId,
  highlight,
}: {
  gradId: string
  facetId: string
  highlight: string
}) {
  const d = 'M 32 56 Q 28 32 52 22 Q 78 14 94 34 Q 104 54 92 78 Q 76 100 52 96 Q 26 92 32 56 Z'
  return (
    <G>
      <Path d={d} fill={`url(#${gradId})`} />
      <Path d={d} fill={`url(#${facetId})`} />
      <Ellipse
        cx={52}
        cy={38}
        rx={14}
        ry={7}
        fill={highlight}
        opacity={0.5}
        rotation={-18}
        origin="52,38"
      />
    </G>
  )
}

function PointGem({
  gradId,
  facetId,
  highlight,
  secondary,
}: {
  gradId: string
  facetId: string
  highlight: string
  secondary: string
}) {
  const body = 'M 60 10 L 86 36 L 82 94 L 38 94 L 34 36 Z'
  const leftFacet = 'M 60 10 L 34 36 L 38 94 Z'
  const rightFacet = 'M 60 10 L 86 36 L 82 94 Z'
  return (
    <G>
      <Path d={body} fill={`url(#${gradId})`} />
      <Path d={leftFacet} fill={secondary} opacity={0.55} />
      <Path d={rightFacet} fill={highlight} opacity={0.32} />
      <Path d={body} fill={`url(#${facetId})`} />
      <Line x1={60} y1={10} x2={60} y2={94} stroke="#ffffff" strokeOpacity={0.25} strokeWidth={0.8} />
      <Circle cx={60} cy={14} r={2.4} fill="#ffffff" opacity={0.8} />
    </G>
  )
}

function ClusterGem({
  gradId,
  facetId,
  secondary,
}: {
  gradId: string
  facetId: string
  secondary: string
}) {
  const base = 'M 18 96 Q 8 78 20 66 Q 40 58 60 62 Q 86 64 102 78 Q 110 94 96 100 Z'
  const p1 = 'M 32 82 L 42 28 L 52 82 Z'
  const p2 = 'M 54 86 L 68 14 L 80 86 Z'
  const p3 = 'M 74 86 L 92 40 L 98 86 Z'
  return (
    <G>
      <Path d={base} fill={secondary} opacity={0.9} />
      <Path d={base} fill={`url(#${facetId})`} opacity={0.4} />
      <Path d={p1} fill={`url(#${gradId})`} />
      <Path d={p1} fill={`url(#${facetId})`} />
      <Path d={p2} fill={`url(#${gradId})`} />
      <Path d={p2} fill={`url(#${facetId})`} />
      <Path d={p3} fill={`url(#${gradId})`} />
      <Path d={p3} fill={`url(#${facetId})`} />
      <Circle cx={42} cy={30} r={1.8} fill="#ffffff" opacity={0.9} />
      <Circle cx={68} cy={16} r={2.2} fill="#ffffff" opacity={0.95} />
      <Circle cx={92} cy={42} r={1.8} fill="#ffffff" opacity={0.9} />
    </G>
  )
}

function RawGem({
  gradId,
  facetId,
  highlight,
  secondary,
}: {
  gradId: string
  facetId: string
  highlight: string
  secondary: string
}) {
  const body = 'M 22 54 L 34 20 L 68 14 L 96 34 L 102 72 L 82 98 L 42 96 L 18 72 Z'
  const facetA = 'M 34 20 L 68 14 L 56 50 Z'
  const facetB = 'M 96 34 L 102 72 L 72 58 Z'
  return (
    <G>
      <Path d={body} fill={`url(#${gradId})`} />
      <Path d={facetA} fill={highlight} opacity={0.35} />
      <Path d={facetB} fill={secondary} opacity={0.45} />
      <Path d={body} fill={`url(#${facetId})`} />
    </G>
  )
}
