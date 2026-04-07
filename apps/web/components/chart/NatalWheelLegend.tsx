'use client'

import { useEffect, useRef, useState } from 'react'
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
    <div
      ref={containerRef}
      className="absolute right-3 top-3 z-20"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
    >
      <button
        type="button"
        aria-label="Легенда на наталната карта"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
        className="flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-slate-900/80 text-slate-200 shadow-lg backdrop-blur transition-colors hover:border-cyan-400/40 hover:text-white focus:outline-none focus:ring-2 focus:ring-cyan-400/50"
      >
        <span className="text-sm font-semibold">i</span>
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-[340px] rounded-2xl border border-slate-700/70 bg-slate-950/95 p-4 text-sm text-slate-300 shadow-[0_18px_50px_rgba(0,0,0,0.45)] backdrop-blur-xl">
          <h4 className="mb-3 text-sm font-semibold text-slate-100">
            Как да четете колелото
          </h4>

          <div className="space-y-3">
            <div>
              <div className="mb-1 flex items-center gap-2">
                <span className="inline-flex gap-1 rounded-lg bg-slate-900/80 px-2 py-1 text-slate-200">
                  {ZODIAC_ICONS.map(name => <CelestialIcon key={name} name={name} size={18} />)}
                </span>
                <p className="font-medium text-slate-200">Зодиакален пръстен</p>
              </div>
              <p className="text-slate-400">
                Външният кръг е разделен на 12 знака. Той показва в кой знак попада всяка планета.
              </p>
            </div>

            <div>
              <p className="font-medium text-slate-200">Домове</p>
              <p className="text-slate-400">
                Вътрешните линии и номерата 1-12 показват домовете. Те описват в коя житейска сфера действа дадена планета.
              </p>
            </div>

            <div>
              <div className="mb-1 flex items-center gap-2">
                <span className="inline-flex gap-1 rounded-lg bg-slate-900/80 px-2 py-1 text-slate-200">
                  {PLANET_ICONS.map(name => <CelestialIcon key={name} name={name} size={18} />)}
                </span>
                <p className="font-medium text-slate-200">Планети</p>
              </div>
              <p className="text-slate-400">
                Цветните символи по кръга са планетите. Натиснете върху тях, за да видите тълкуване отдолу.
              </p>
            </div>

            <div>
              <p className="font-medium text-slate-200">Аспекти</p>
              <p className="text-slate-400">
                Линиите в центъра показват връзки между планетите. Те описват как различни части от характера работят в синхрон или напрежение.
              </p>
            </div>

            <div>
              <p className="font-medium text-slate-200">Точките по вътрешния кръг</p>
              <p className="text-slate-400">
                Малките цветни точки показват откъде точно започва аспектът за всяка планета. Цветът им съвпада със съответната планета.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3 rounded-xl bg-slate-900/70 p-3">
              <div>
                <div className="mb-1 flex items-center gap-2">
                  <span className="h-3 w-8 rounded-full bg-cyan-400" />
                  <span className="font-medium text-slate-200">Синя линия</span>
                </div>
                <p className="text-xs text-slate-400">
                  Асцендент. Показва как се проявявате и как ви възприемат първоначално.
                </p>
              </div>

              <div>
                <div className="mb-1 flex items-center gap-2">
                  <span className="h-3 w-8 rounded-full bg-pink-400" />
                  <span className="font-medium text-slate-200">Розова линия</span>
                </div>
                <p className="text-xs text-slate-400">
                  MC. Свързан е с посока, призвание, репутация и обществен образ.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
