'use client'

import type { HouseData } from '@stellaeum/astrology/client'
import { formatDegreeInSign } from './chart-sections'

interface HousesListProps {
  houses: readonly HouseData[]
  birthTimeKnown: boolean
}

const HOUSE_THEMES: Record<number, string> = {
  1:  'самоличност, външен вид',
  2:  'ценности, ресурси',
  3:  'общуване, близко обкръжение',
  4:  'дом, корени',
  5:  'творчество, удоволствие',
  6:  'ежедневие, здраве',
  7:  'партньорство',
  8:  'дълбина, трансформация',
  9:  'философия, пътуване',
  10: 'призвание, статус',
  11: 'общности, бъдеще',
  12: 'подсъзнание, уединение',
}

/**
 * Карта · Къщи (§2.2). 12 house cusps with themes. House system is
 * Placidus per the ADR in SUMMARY.md — small badge marks it for the
 * curious user.
 */
export function HousesList({ houses, birthTimeKnown }: HousesListProps) {
  if (!birthTimeKnown) {
    return (
      <div className="border-l border-amber-300/40 bg-gradient-to-r from-amber-300/[0.05] via-transparent to-violet-400/[0.04] px-5 py-4">
        <p className="mb-2 font-cinzel text-[9px] font-semibold uppercase tracking-[0.32em] text-amber-300/80">
          Забележка
        </p>
        <p className="font-display text-[13px] font-light leading-relaxed text-amber-100/85">
          Къщите зависят от точното време на раждане. Добави час за пълна карта.
        </p>
      </div>
    )
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <p className="font-cinzel text-[9.5px] font-semibold uppercase tracking-[0.32em] text-slate-400">
          12 къщи · куспиди
        </p>
        <span className="font-cinzel text-[9px] uppercase tracking-[0.26em] text-slate-600">
          Placidus
        </span>
      </div>

      <ul className="divide-y divide-slate-800/60">
        {houses.map((house) => (
          <li
            key={house.number}
            className="flex items-center justify-between gap-4 py-3.5"
          >
            <div className="flex items-center gap-4">
              <span className="w-8 font-cinzel text-[10.5px] font-semibold uppercase tracking-[0.22em] text-amber-300/70">
                H{house.number}
              </span>
              <span className="font-display text-[12.5px] font-light text-slate-300">
                {formatDegreeInSign(house.signDegree, house.sign)}
              </span>
            </div>
            <span className="font-display text-[11.5px] font-light text-slate-500">
              {HOUSE_THEMES[house.number]}
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}
