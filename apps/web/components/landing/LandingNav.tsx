'use client'

import Link from 'next/link'

export function LandingNav() {
  const scrollTo = (id: string) => {
    const element = document.getElementById(id)
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' })
    }
  }

  return (
    <nav className="sticky top-0 z-50 border-b border-slate-800/50 bg-slate-900/80 backdrop-blur-xl">
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        {/* Logo */}
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-purple-500 to-violet-600">
            <span className="text-sm font-bold text-white">C</span>
          </div>
          <span className="font-semibold text-slate-100">Celestia</span>
        </div>

        {/* Nav tabs - hidden on mobile, visible on md+ */}
        <div className="hidden items-center gap-6 md:flex">
          <button
            onClick={() => scrollTo('features')}
            className="text-slate-300 transition-colors hover:text-white"
          >
            Функции
          </button>
          <button
            onClick={() => scrollTo('pricing')}
            className="text-slate-300 transition-colors hover:text-white"
          >
            Цени
          </button>
          <button
            onClick={() => scrollTo('about')}
            className="text-slate-300 transition-colors hover:text-white"
          >
            За нас
          </button>
        </div>

        {/* CTA */}
        <div className="flex items-center gap-3">
          <Link
            href="/auth"
            className="text-sm text-slate-300 transition-colors hover:text-white"
          >
            Вход
          </Link>
          <Link
            href="/auth"
            className="rounded-lg bg-gradient-to-r from-purple-600 to-violet-600 px-4 py-2 text-sm font-medium text-white transition-all hover:from-purple-500 hover:to-violet-500"
          >
            Регистрация
          </Link>
        </div>
      </div>
    </nav>
  )
}
