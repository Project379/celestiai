import { CelestialBackgroundLazy } from '@/components/CelestialBackgroundLazy'
import { LandingSplash } from '@/components/landing/LandingSplash'

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <LandingSplash>
      <div className="relative min-h-screen">
        <CelestialBackgroundLazy />
        <main className="relative z-10 flex min-h-screen items-center justify-center px-4 py-8">
          {children}
        </main>
      </div>
    </LandingSplash>
  )
}
