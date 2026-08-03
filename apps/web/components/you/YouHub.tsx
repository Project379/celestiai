'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'

const SECTIONS = [
  { label: 'Кристали',    hint: 'месечни прозорци + дневна серия', href: '/you/crystals'        },
  { label: 'Дневник',     hint: 'лунен дневник — по три реда',     href: '/rhythm/journal'      },
  { label: 'Препоръки',   hint: 'месечни книги и филми',            href: '/you/recommendations' },
  { label: 'Ръководство', hint: 'планети, знаци, къщи, аспекти',    href: '/you/guide'           },
] as const

const fadeUp = {
  hidden: { opacity: 0, y: 18, filter: 'blur(8px)' },
  visible: (i: number = 0) => ({
    opacity: 1,
    y: 0,
    filter: 'blur(0px)',
    transition: {
      duration: 0.62,
      delay: i * 0.06,
      ease: [0.22, 0.68, 0.35, 1] as const,
    },
  }),
}

export function YouHub() {
  return (
    <div className="mx-auto max-w-2xl">
      <motion.div
        initial="hidden"
        animate="visible"
        variants={fadeUp}
        custom={0}
        className="mb-12"
      >
        <p className="mb-4 font-cinzel text-[10px] font-semibold uppercase tracking-[0.42em] text-slate-300">
          Ти
        </p>
        <h1 className="font-display text-[2.125rem] font-light leading-[1.2] tracking-tight text-slate-100 sm:text-[2.75rem]">
          Твоите неща.
        </h1>
      </motion.div>

      <motion.ul
        initial="hidden"
        animate="visible"
        variants={fadeUp}
        custom={1}
        className="divide-y divide-slate-800/60"
      >
        {SECTIONS.map((section) => (
          <li key={section.href}>
            <Link
              href={section.href}
              className="group flex items-baseline justify-between py-6 transition-colors duration-200"
            >
              <span className="font-cinzel text-[11px] font-semibold uppercase tracking-[0.32em] text-slate-200 group-hover:text-amber-200">
                {section.label}
              </span>
              <span className="font-display text-[13px] font-light text-slate-500 group-hover:text-slate-300">
                {section.hint}
              </span>
            </Link>
          </li>
        ))}
      </motion.ul>

      <p className="mt-12 font-display text-[12.5px] font-light leading-[1.7] text-slate-600">
        Премиум, настройки и акаунт — в менюто горе вдясно.
      </p>
    </div>
  )
}
