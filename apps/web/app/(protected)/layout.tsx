import { auth } from '@clerk/nextjs/server'
import Link from 'next/link'
import { CelestialBackgroundLazy } from '@/components/CelestialBackgroundLazy'
import { NavigationTransition } from '@/components/NavigationTransition'

export default async function ProtectedLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { userId } = await auth()

  return (
    <div className="relative min-h-screen">
      {/* Animated celestial background — behind everything */}
      <CelestialBackgroundLazy />

      {/* Content layer — pointer-events-none so constellation clicks pass through */}
      <div className="relative z-10 pointer-events-none">
        {/* Header */}
        <header className="pointer-events-auto sticky top-0 z-50 border-b border-slate-800/50 bg-slate-900/80 backdrop-blur-xl">
          <div className="container mx-auto flex h-16 items-center justify-between px-4">
            <Link href="/dashboard" className="flex items-center gap-3 transition-opacity hover:opacity-80">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-cyan-500 to-blue-600">
                <span className="text-sm font-bold text-white font-display">C</span>
              </div>
              <span className="font-semibold font-display text-slate-100 tracking-wide">Celestia</span>
            </Link>
            <div id="user-menu-slot" />
          </div>
        </header>

        {/* Main content with navigation transition */}
        <main className="pointer-events-auto container mx-auto px-4 py-8">
          <NavigationTransition>
            {children}
          </NavigationTransition>
        </main>
      </div>
    </div>
  )
}
