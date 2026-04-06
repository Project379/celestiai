'use client'

import dynamic from 'next/dynamic'
import type { CelestialCanvasProps } from './CelestialCanvas'

const CelestialCanvas = dynamic(
  () => import('./CelestialCanvas').then(m => ({ default: m.CelestialCanvas })),
  { ssr: false }
)

export function CelestialCanvasLazy(props: CelestialCanvasProps) {
  return <CelestialCanvas {...props} />
}
