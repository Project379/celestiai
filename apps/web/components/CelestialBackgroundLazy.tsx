'use client'

import dynamic from 'next/dynamic'

const CelestialBackground = dynamic(
  () => import('./CelestialBackground').then(m => ({ default: m.CelestialBackground })),
  { ssr: false }
)

export function CelestialBackgroundLazy() {
  return <CelestialBackground />
}
