'use client'

import Link from 'next/link'
import { useSession } from '@clerk/nextjs'

export function LandingNav() {
  const session = useSession()

  let authContent: React.ReactNode
  if (!session.isLoaded) {
    authContent = null
  } else if (session.isSignedIn) {
    authContent = (
      <Link
        href="/dashboard"
        className="group relative inline-flex items-center gap-2 overflow-hidden rounded-full border border-amber-300/40 bg-gradient-to-r from-violet-500/10 via-transparent to-amber-400/10 px-5 py-2 font-cinzel text-[9.5px] font-semibold uppercase tracking-[0.32em] text-amber-200 transition-all hover:border-amber-300/70 hover:text-amber-100 hover:shadow-[0_0_22px_rgba(251,191,36,0.18)]"
      >
        <span
          aria-hidden
          className="pointer-events-none absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-amber-200/15 to-transparent transition-transform duration-700 group-hover:translate-x-full"
        />
        <span className="relative">Таблото ми</span>
      </Link>
    )
  } else {
    authContent = (
      <div className="flex items-center gap-5">
        <Link
          href="/sign-in"
          className="font-cinzel text-[9.5px] font-semibold uppercase tracking-[0.32em] text-slate-400 transition-colors hover:text-amber-300"
        >
          Вход
        </Link>
        <Link
          href="/sign-up"
          className="group relative inline-flex items-center gap-2 overflow-hidden rounded-full border border-amber-300/40 bg-gradient-to-r from-violet-500/10 via-transparent to-amber-400/10 px-5 py-2 font-cinzel text-[9.5px] font-semibold uppercase tracking-[0.32em] text-amber-200 transition-all hover:border-amber-300/70 hover:text-amber-100 hover:shadow-[0_0_22px_rgba(251,191,36,0.18)]"
        >
          <span
            aria-hidden
            className="pointer-events-none absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-amber-200/15 to-transparent transition-transform duration-700 group-hover:translate-x-full"
          />
          <span className="relative">Регистрация</span>
        </Link>
      </div>
    )
  }

  const scrollTo = (id: string) => {
    const element = document.getElementById(id)
    if (element) element.scrollIntoView({ behavior: 'smooth' })
  }

  return (
    <nav className="sticky top-0 z-50 border-b border-white/[0.05] bg-[#08060f]/85 backdrop-blur-xl">
      {/* Top ivory hairline + amber center accent */}
      <div
        aria-hidden
        className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-slate-200/20 to-transparent"
      />
      <div
        aria-hidden
        className="absolute left-1/2 top-0 h-px w-32 -translate-x-1/2 bg-gradient-to-r from-transparent via-amber-300/40 to-transparent"
      />

      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        {/* Logo */}
        <Link href="/" className="group flex items-center gap-2.5 transition-opacity hover:opacity-90">
          <div className="relative flex h-8 w-8 items-center justify-center rounded-md border border-slate-200/10 bg-gradient-to-br from-violet-500/20 via-transparent to-amber-400/10">
            <span aria-hidden className="absolute inset-0 rounded-md bg-violet-500/10 blur-sm" />
            <span className="relative font-cinzel text-xs font-bold text-amber-200/90">C</span>
          </div>
          <span className="font-cinzel text-[12px] font-semibold uppercase tracking-[0.24em] text-slate-100/90 transition-colors group-hover:text-white">
            Celestia
          </span>
        </Link>

        {/* Nav anchors */}
        <div className="hidden items-center gap-8 md:flex">
          {[
            { id: 'features', label: 'Функции' },
            { id: 'pricing',  label: 'Цени'    },
            { id: 'about',    label: 'За нас'  },
          ].map((item) => (
            <button
              key={item.id}
              onClick={() => scrollTo(item.id)}
              className="group relative font-cinzel text-[9.5px] font-semibold uppercase tracking-[0.32em] text-slate-500 transition-colors hover:text-amber-300"
            >
              {item.label}
              <span
                aria-hidden
                className="absolute -bottom-1.5 left-0 right-0 h-px scale-x-0 bg-gradient-to-r from-transparent via-amber-300/60 to-transparent transition-transform duration-300 group-hover:scale-x-100"
              />
            </button>
          ))}
        </div>

        <div className="flex items-center gap-3">{authContent}</div>
      </div>
    </nav>
  )
}
