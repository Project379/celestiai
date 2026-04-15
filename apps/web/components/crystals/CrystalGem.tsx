import React from 'react'

/**
 * Procedural SVG crystal renderer — no bitmap assets.
 *
 * Each variant composes gradients, facet lines, and specular highlights
 * from the crystal's primary / secondary / accent colors. The output is
 * a pure SVG element so it renders identically on web (Next.js) and
 * mobile (react-native-svg inside Solito) when the mobile port lands.
 *
 * The ambient glow lives outside the gem geometry so it can be tuned or
 * removed without touching the gem itself.
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
  className?: string
}

function hashSeed(seed: string): number {
  let h = 0
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) | 0
  return Math.abs(h)
}

export function CrystalGem({
  variant,
  primary,
  secondary,
  accent,
  size = 128,
  glow = true,
  seed = 'default',
  className = '',
}: CrystalGemProps) {
  const gradId = `gem-grad-${variant}-${hashSeed(seed + primary)}`
  const glowId = `gem-glow-${variant}-${hashSeed(seed + primary)}`
  const facetId = `gem-facet-${variant}-${hashSeed(seed + primary)}`
  const highlight = accent ?? lighten(primary)

  return (
    <svg
      viewBox="0 0 120 120"
      width={size}
      height={size}
      className={className}
      aria-hidden
    >
      <defs>
        <radialGradient id={gradId} cx="35%" cy="30%" r="78%">
          <stop offset="0%" stopColor={highlight} stopOpacity="1" />
          <stop offset="45%" stopColor={primary} stopOpacity="1" />
          <stop offset="100%" stopColor={secondary} stopOpacity="1" />
        </radialGradient>
        <linearGradient id={facetId} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.38" />
          <stop offset="50%" stopColor="#ffffff" stopOpacity="0.02" />
          <stop offset="100%" stopColor="#000000" stopOpacity="0.28" />
        </linearGradient>
        <filter
          id={glowId}
          x="-50%"
          y="-50%"
          width="200%"
          height="200%"
        >
          <feGaussianBlur stdDeviation="6" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {glow && (
        <circle
          cx="60"
          cy="60"
          r="54"
          fill={primary}
          opacity="0.12"
          filter={`blur(12px)`}
        />
      )}

      <g filter={glow ? `url(#${glowId})` : undefined}>
        {variant === 'sphere' && (
          <SphereGem
            gradId={gradId}
            facetId={facetId}
            highlight={highlight}
            primary={primary}
          />
        )}
        {variant === 'tumbled' && (
          <TumbledGem
            gradId={gradId}
            facetId={facetId}
            highlight={highlight}
          />
        )}
        {variant === 'point' && (
          <PointGem
            gradId={gradId}
            facetId={facetId}
            highlight={highlight}
            secondary={secondary}
          />
        )}
        {variant === 'cluster' && (
          <ClusterGem
            gradId={gradId}
            facetId={facetId}
            highlight={highlight}
            primary={primary}
            secondary={secondary}
          />
        )}
        {variant === 'raw' && (
          <RawGem
            gradId={gradId}
            facetId={facetId}
            highlight={highlight}
            secondary={secondary}
          />
        )}
      </g>
    </svg>
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
    <g>
      <circle cx="60" cy="62" r="44" fill={primary} opacity="0.4" />
      <circle cx="60" cy="60" r="44" fill={`url(#${gradId})`} />
      <circle cx="60" cy="60" r="44" fill={`url(#${facetId})`} />
      <ellipse
        cx="46"
        cy="44"
        rx="14"
        ry="9"
        fill={highlight}
        opacity="0.55"
      />
      <ellipse
        cx="72"
        cy="78"
        rx="9"
        ry="5"
        fill="#ffffff"
        opacity="0.08"
      />
    </g>
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
  // Asymmetric tumbled pebble shape
  const d =
    'M 32 56 Q 28 32 52 22 Q 78 14 94 34 Q 104 54 92 78 Q 76 100 52 96 Q 26 92 32 56 Z'
  return (
    <g>
      <path d={d} fill={`url(#${gradId})`} />
      <path d={d} fill={`url(#${facetId})`} />
      <ellipse
        cx="52"
        cy="38"
        rx="14"
        ry="7"
        fill={highlight}
        opacity="0.5"
        transform="rotate(-18 52 38)"
      />
    </g>
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
  // Obelisk / hexagonal point
  const body = 'M 60 10 L 86 36 L 82 94 L 38 94 L 34 36 Z'
  const leftFacet = 'M 60 10 L 34 36 L 38 94 Z'
  const rightFacet = 'M 60 10 L 86 36 L 82 94 Z'
  return (
    <g>
      <path d={body} fill={`url(#${gradId})`} />
      <path d={leftFacet} fill={secondary} opacity="0.55" />
      <path d={rightFacet} fill={highlight} opacity="0.32" />
      <path d={body} fill={`url(#${facetId})`} />
      <line
        x1="60"
        y1="10"
        x2="60"
        y2="94"
        stroke="#ffffff"
        strokeOpacity="0.25"
        strokeWidth="0.8"
      />
      <circle cx="60" cy="14" r="2.4" fill="#ffffff" opacity="0.8" />
    </g>
  )
}

function ClusterGem({
  gradId,
  facetId,
  highlight,
  primary,
  secondary,
}: {
  gradId: string
  facetId: string
  highlight: string
  primary: string
  secondary: string
}) {
  // Three points rising from a base rock
  const base = 'M 18 96 Q 8 78 20 66 Q 40 58 60 62 Q 86 64 102 78 Q 110 94 96 100 Z'
  const p1 = 'M 32 82 L 42 28 L 52 82 Z'
  const p2 = 'M 54 86 L 68 14 L 80 86 Z'
  const p3 = 'M 74 86 L 92 40 L 98 86 Z'
  return (
    <g>
      <path d={base} fill={secondary} opacity="0.9" />
      <path d={base} fill={`url(#${facetId})`} opacity="0.4" />
      <path d={p1} fill={`url(#${gradId})`} />
      <path d={p1} fill={`url(#${facetId})`} />
      <path d={p2} fill={`url(#${gradId})`} />
      <path d={p2} fill={`url(#${facetId})`} />
      <path d={p3} fill={`url(#${gradId})`} />
      <path d={p3} fill={`url(#${facetId})`} />
      <circle cx="42" cy="30" r="1.8" fill="#ffffff" opacity="0.9" />
      <circle cx="68" cy="16" r="2.2" fill="#ffffff" opacity="0.95" />
      <circle cx="92" cy="42" r="1.8" fill="#ffffff" opacity="0.9" />
    </g>
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
  // Irregular chunk with a few sharp facets
  const body = 'M 22 54 L 34 20 L 68 14 L 96 34 L 102 72 L 82 98 L 42 96 L 18 72 Z'
  const facetA = 'M 34 20 L 68 14 L 56 50 Z'
  const facetB = 'M 96 34 L 102 72 L 72 58 Z'
  return (
    <g>
      <path d={body} fill={`url(#${gradId})`} />
      <path d={facetA} fill={highlight} opacity="0.35" />
      <path d={facetB} fill={secondary} opacity="0.45" />
      <path d={body} fill={`url(#${facetId})`} />
    </g>
  )
}

function lighten(hex: string): string {
  // Clamp lighten fallback when no accent colour is supplied.
  const clean = hex.replace('#', '')
  if (clean.length !== 6) return '#ffffff'
  const r = Math.min(255, parseInt(clean.slice(0, 2), 16) + 48)
  const g = Math.min(255, parseInt(clean.slice(2, 4), 16) + 48)
  const b = Math.min(255, parseInt(clean.slice(4, 6), 16) + 48)
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`
}
