import Link from 'next/link'
import { LandingNav } from '@/components/landing/LandingNav'
import { FeaturesSection } from '@/components/landing/FeaturesSection'
import { PricingSection } from '@/components/landing/PricingSection'
import { AboutSection } from '@/components/landing/AboutSection'

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 via-slate-900 to-purple-900/20">
      <LandingNav />

      {/* Hero section */}
      <section className="container mx-auto px-4 py-20 text-center">
        <h1 className="mb-6 bg-gradient-to-r from-purple-400 to-violet-400 bg-clip-text text-4xl font-bold text-transparent md:text-6xl">
          Celestia AI
        </h1>
        <p className="mx-auto mb-8 max-w-2xl text-xl text-slate-300">
          Вашият персонален астрологичен спътник. Открийте тайните на звездите.
        </p>
        <Link
          href="/sign-up"
          className="inline-flex rounded-lg bg-gradient-to-r from-purple-600 to-violet-600 px-8 py-4 text-lg font-medium text-white transition-all hover:from-purple-500 hover:to-violet-500"
        >
          Започнете безплатно
        </Link>
      </section>

      <FeaturesSection />
      <PricingSection />
      <AboutSection />

      {/* Footer */}
      <footer className="border-t border-slate-800/50 py-8">
        <p className="text-center text-sm text-slate-500">
          &copy; 2026 Celestia AI. Всички права запазени.
        </p>
      </footer>
    </div>
  )
}
