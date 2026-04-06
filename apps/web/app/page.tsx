import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { LandingNav } from '@/components/landing/LandingNav'
import { FeaturesSection } from '@/components/landing/FeaturesSection'
import { PricingSection } from '@/components/landing/PricingSection'
import { AboutSection } from '@/components/landing/AboutSection'
import { CelestialBackgroundLazy } from '@/components/CelestialBackgroundLazy'

export default async function HomePage() {
  const { userId } = await auth()

  if (userId) {
    redirect('/dashboard')
  }

  return (
    <div className="relative min-h-screen">
      <CelestialBackgroundLazy />

      <div className="relative z-10">
      <LandingNav />

      {/* Hero section */}
      <section className="relative overflow-hidden">
        <div className="container relative mx-auto px-4 py-32 text-center md:py-40">
          <h1 className="mb-6 bg-gradient-to-r from-purple-400 to-violet-400 bg-clip-text text-4xl font-bold text-transparent md:text-6xl">
            Celestia AI
          </h1>
          <p className="mx-auto mb-4 max-w-2xl text-xl text-slate-200 md:text-2xl">
            Звездите имат какво да ти кажат. Ние просто превеждаме.
          </p>
          <p className="mx-auto mb-8 max-w-2xl text-lg text-slate-400">
            Твоят личен астрологичен приятел, подсилен от AI
          </p>
          <Link
            href="/sign-in"
            className="inline-flex rounded-lg bg-gradient-to-r from-purple-600 to-violet-600 px-8 py-4 text-lg font-medium text-white transition-all hover:from-purple-500 hover:to-violet-500"
          >
            Открий звездите си
          </Link>
        </div>
      </section>

      <FeaturesSection />

      {/* Primary CTA block after features */}
      <section className="py-16">
        <div className="container mx-auto px-4 text-center">
          <p className="mx-auto mb-8 max-w-2xl text-xl text-slate-300 md:text-2xl">
            Любопитно ти е какво казват звездите за теб?
          </p>
          <Link
            href="/auth"
            className="inline-flex rounded-lg bg-gradient-to-r from-purple-600 to-violet-600 px-10 py-4 text-lg font-medium text-white transition-all hover:from-purple-500 hover:to-violet-500"
          >
            Започни безплатно
          </Link>
        </div>
      </section>

      <PricingSection />
      <AboutSection />

      {/* Footer */}
      <footer className="border-t border-slate-800/50 py-8">
        <div className="container mx-auto flex flex-col items-center gap-4 px-4 md:flex-row md:justify-between">
          <p className="text-sm text-slate-500">
            &copy; 2026 Celestia AI. Всички права запазени.
          </p>
          <Link
            href="/privacy"
            className="text-sm text-slate-500 transition-colors hover:text-slate-400"
          >
            Политика за поверителност
          </Link>
        </div>
      </footer>
      </div>
    </div>
  )
}
