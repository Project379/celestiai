'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { motion } from 'framer-motion'

type NavItem = {
  label: string
  href: string
}

// 5-tab IA per .planning/research/MOBILE_UX_RESEARCH.md §2.
const NAV_ITEMS: readonly NavItem[] = [
  { label: 'Днес',  href: '/dashboard' },
  { label: 'Карта', href: '/chart'     },
  { label: 'Кръг',  href: '/circle'    },
  { label: 'Ритъм', href: '/rhythm'    },
  { label: 'Ти',    href: '/you'       },
]

// Оракул lives in the FAB (components/oracle/OracleFab.tsx) — not the nav.
export function ProtectedNav() {
  const pathname = usePathname()

  const activeHref = NAV_ITEMS.find((item) =>
    pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href))
  )?.href

  return (
    <nav
      aria-label="Основна навигация"
      className="nav-scroll flex h-8 items-center gap-8 overflow-x-auto"
    >
      {NAV_ITEMS.map((item) => {
        const isActive = activeHref === item.href
        return (
          <Link
            key={item.href}
            href={item.href}
            className="group relative flex h-full shrink-0 items-center"
          >
            <span
              className={`font-cinzel text-[10px] font-semibold uppercase leading-none tracking-[0.34em] transition-colors duration-200 ${
                isActive ? 'text-amber-200' : 'text-slate-500 group-hover:text-slate-200'
              }`}
            >
              {item.label}
            </span>

            {/* Active sliding amber hairline */}
            {isActive && (
              <motion.span
                layoutId="protected-nav-underline"
                aria-hidden
                className="absolute inset-x-0 -bottom-0.5 h-px bg-gradient-to-r from-transparent via-amber-300/80 to-transparent shadow-[0_0_10px_rgba(251,191,36,0.45)]"
                transition={{ duration: 0.45, ease: [0.22, 0.68, 0.35, 1] }}
              />
            )}

            {/* Hover hairline (when not active) */}
            {!isActive && (
              <span
                aria-hidden
                className="absolute inset-x-0 -bottom-0.5 h-px scale-x-0 bg-gradient-to-r from-transparent via-slate-300/35 to-transparent transition-transform duration-300 group-hover:scale-x-100"
              />
            )}
          </Link>
        )
      })}
    </nav>
  )
}
