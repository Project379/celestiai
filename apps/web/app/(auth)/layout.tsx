import { CelestialBackgroundLazy } from '@/components/CelestialBackgroundLazy'

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="relative min-h-screen">
      <CelestialBackgroundLazy />
      <main className="relative z-10 flex min-h-screen items-center justify-center px-4 py-8">
        {children}
      </main>
    </div>
  )
}
