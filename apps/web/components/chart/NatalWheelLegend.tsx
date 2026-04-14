'use client'

import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { CelestialIcon } from '@/components/icons/CelestialIcons'

const PLANET_ICONS = ['sun', 'moon', 'mercury', 'venus', 'mars']
const ZODIAC_ICONS = ['aries', 'taurus', 'gemini', 'cancer', 'leo', 'virgo']

export function NatalWheelLegend() {
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handlePointerDown = (event: MouseEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handlePointerDown)
    return () => document.removeEventListener('mousedown', handlePointerDown)
  }, [])

  return (
    <div ref={containerRef} className="absolute right-3 top-3 z-[60]">
      <button
        type="button"
        aria-label="Легенда на наталната карта"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="group relative flex h-9 w-9 cursor-pointer items-center justify-center rounded-full border border-white/[0.08] bg-[#08060f]/85 backdrop-blur transition-all duration-200 hover:border-amber-300/50 hover:shadow-[0_0_18px_rgba(251,191,36,0.22)] focus:outline-none focus-visible:ring-1 focus-visible:ring-amber-300/60"
      >
        <span className="font-cinzel text-[11px] font-semibold italic text-slate-300 transition-colors group-hover:text-amber-200">
          i
        </span>
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -6, filter: 'blur(6px)' }}
            animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
            exit={{ opacity: 0, y: -4, filter: 'blur(4px)' }}
            transition={{ duration: 0.28, ease: [0.22, 0.68, 0.35, 1] }}
            className="mystic-panel absolute right-0 mt-3 w-[320px] overflow-hidden"
          >
            {/* Ambient atmosphere */}
            <div
              aria-hidden
              className="pointer-events-none absolute -left-14 -top-14 h-[220px] w-[220px] rounded-full bg-violet-500/[0.10] blur-[80px]"
            />
            <div
              aria-hidden
              className="pointer-events-none absolute -right-10 -bottom-10 h-[160px] w-[160px] rounded-full bg-amber-500/[0.06] blur-[70px]"
            />

            <div className="relative px-5 py-5">
              {/* Header */}
              <p className="mb-4 flex items-center gap-3 font-cinzel text-[9.5px] font-semibold uppercase tracking-[0.38em] text-amber-300/80">
                <span aria-hidden className="h-1 w-1 rotate-45 bg-amber-300/90 shadow-[0_0_6px_rgba(251,191,36,0.55)]" />
                Легенда
              </p>

              {/* Editorial definition list */}
              <dl className="divide-y divide-white/[0.05]">
                {/* Zodiac */}
                <div className="flex items-start gap-4 py-3">
                  <span className="inline-flex shrink-0 items-center gap-0.5 text-slate-200/85">
                    {ZODIAC_ICONS.map((name) => (
                      <CelestialIcon key={name} name={name} size={13} />
                    ))}
                  </span>
                  <div className="min-w-0">
                    <dt className="font-display text-[13px] font-semibold text-slate-100">
                      Зодиак
                    </dt>
                    <dd className="mt-0.5 font-display text-[12px] italic leading-snug text-slate-400/90">
                      12 знака по външния пояс — показват в кой знак попада всяка планета.
                    </dd>
                  </div>
                </div>

                {/* Houses */}
                <div className="flex items-start gap-4 py-3">
                  <span className="inline-flex shrink-0 items-center justify-center font-cinzel text-[10px] font-semibold tabular-nums text-amber-300/80">
                    1–12
                  </span>
                  <div className="min-w-0">
                    <dt className="font-display text-[13px] font-semibold text-slate-100">
                      Домове
                    </dt>
                    <dd className="mt-0.5 font-display text-[12px] italic leading-snug text-slate-400/90">
                      12 житейски сфери — домът казва <span className="text-slate-300">къде</span> действа планетата.
                    </dd>
                  </div>
                </div>

                {/* Planets */}
                <div className="flex items-start gap-4 py-3">
                  <span className="inline-flex shrink-0 items-center gap-0.5 text-slate-200/85">
                    {PLANET_ICONS.map((name) => (
                      <CelestialIcon key={name} name={name} size={13} />
                    ))}
                  </span>
                  <div className="min-w-0">
                    <dt className="font-display text-[13px] font-semibold text-slate-100">
                      Планети
                    </dt>
                    <dd className="mt-0.5 font-display text-[12px] italic leading-snug text-slate-400/90">
                      Всяка носи жизнен принцип. Натисни за тълкуване.
                    </dd>
                  </div>
                </div>

                {/* Aspects */}
                <div className="flex items-start gap-4 py-3">
                  <span className="flex shrink-0 flex-col gap-1 py-1">
                    <span className="h-px w-6 bg-emerald-400/80 shadow-[0_0_6px_rgba(52,211,153,0.5)]" />
                    <span className="h-px w-6 bg-rose-400/80 shadow-[0_0_6px_rgba(251,113,133,0.5)]" />
                  </span>
                  <div className="min-w-0">
                    <dt className="font-display text-[13px] font-semibold text-slate-100">
                      Аспекти
                    </dt>
                    <dd className="mt-0.5 font-display text-[12px] italic leading-snug text-slate-400/90">
                      Линиите в центъра — зелено е хармония, розово е напрежение.
                    </dd>
                  </div>
                </div>

                {/* Angles */}
                <div className="flex items-start gap-4 py-3">
                  <span className="flex shrink-0 flex-col gap-1 py-1">
                    <span className="h-px w-6 bg-cyan-400/80 shadow-[0_0_6px_rgba(34,211,238,0.5)]" />
                    <span className="h-px w-6 bg-pink-400/80 shadow-[0_0_6px_rgba(244,114,182,0.5)]" />
                  </span>
                  <div className="min-w-0">
                    <dt className="font-display text-[13px] font-semibold text-slate-100">
                      Ъгли
                    </dt>
                    <dd className="mt-0.5 font-display text-[12px] italic leading-snug text-slate-400/90">
                      Асцендент <span className="text-slate-300">(персона)</span> и Медиум Цели <span className="text-slate-300">(цел)</span>.
                    </dd>
                  </div>
                </div>

                {/* Retrograde */}
                <div className="flex items-start gap-4 py-3">
                  <span className="inline-flex h-5 w-5 shrink-0 items-center justify-center font-cinzel text-[10px] font-bold text-rose-300/90">
                    R
                  </span>
                  <div className="min-w-0">
                    <dt className="font-display text-[13px] font-semibold text-slate-100">
                      Ретрограден
                    </dt>
                    <dd className="mt-0.5 font-display text-[12px] italic leading-snug text-slate-400/90">
                      Планетата изглежда движеща се назад — по-вътрешна енергия.
                    </dd>
                  </div>
                </div>
              </dl>

              <p className="mt-4 border-t border-white/[0.05] pt-3 font-cinzel text-[8.5px] font-semibold uppercase tracking-[0.28em] text-slate-600">
                За детайли → раздел Речник
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
