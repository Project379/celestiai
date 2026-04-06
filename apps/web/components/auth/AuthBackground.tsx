'use client'

import dynamic from 'next/dynamic'

const CelestialCanvas = dynamic(
  () => import('@/components/CelestialCanvas').then(m => ({ default: m.CelestialCanvas })),
  { ssr: false }
)

export function AuthBackground() {
  return (
    <div className="pointer-events-none fixed inset-0 -z-10">
      {/* Canvas handles the gradient background + stars + milky way */}
      <CelestialCanvas className="absolute inset-0" interactive={false} starCount={250} />
    </div>
  )
}
