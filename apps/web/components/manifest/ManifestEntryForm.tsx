'use client'

import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import type { LunarPhase } from '@/lib/moon-phase'
import type { ManifestEntry } from '@stellaeum/core/diary/types'
import { getManifestPrompt } from '@stellaeum/core/diary/prompts'

interface ManifestEntryFormProps {
  phase: LunarPhase
  today: string
  existing: ManifestEntry | null
  entryCountForPhase: number
  onSave: (intentions: [string, string, string]) => void
}

export function ManifestEntryForm({
  phase,
  today,
  existing,
  entryCountForPhase,
  onSave,
}: ManifestEntryFormProps) {
  const prompt = getManifestPrompt(phase.id, entryCountForPhase)
  const [values, setValues] = useState<[string, string, string]>(
    existing ? [...existing.intentions] : ['', '', ''],
  )
  const [savedFlash, setSavedFlash] = useState(false)

  // If an existing entry appears after hydration (localStorage loads async),
  // seed the form from it — once.
  useEffect(() => {
    if (existing) setValues([...existing.intentions])
  }, [existing?.id])

  const handleChange = (index: 0 | 1 | 2) => (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const next: [string, string, string] = [...values] as [string, string, string]
    next[index] = e.target.value
    setValues(next)
  }

  const allFilled = values.every(v => v.trim().length > 0)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!allFilled) return
    onSave(values.map(v => v.trim()) as [string, string, string])
    setSavedFlash(true)
    setTimeout(() => setSavedFlash(false), 2400)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-7">
      <header>
        <p className="mb-2 font-cinzel text-[10px] font-semibold uppercase tracking-[0.38em] text-amber-300/90">
          {prompt.heading}
        </p>
        <p className="font-display text-[15.5px] font-light leading-[1.8] text-slate-300 sm:text-[16.5px]">
          {prompt.lead}
        </p>
        <p className="mt-3 font-cinzel text-[9.5px] uppercase tracking-[0.3em] text-slate-500">
          {phase.name} · {today}
        </p>
      </header>

      <div className="space-y-6">
        {[0, 1, 2].map((i) => (
          <Field
            key={i}
            index={i as 0 | 1 | 2}
            label={prompt.fieldLabels[i]}
            placeholder={prompt.placeholders[i]}
            value={values[i]}
            onChange={handleChange(i as 0 | 1 | 2)}
          />
        ))}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-4 border-t border-slate-300/[0.08] pt-6">
        <p className="font-display text-[12.5px] font-light leading-[1.75] text-slate-500">
          {existing ? 'Вече писа днес — можеш да поправяш, докато цикълът не се смени.' : 'Запази, когато и трите са готови.'}
        </p>
        <button
          type="submit"
          disabled={!allFilled}
          className="group inline-flex items-center gap-2.5 rounded-full border border-amber-300/40 bg-gradient-to-b from-amber-400/20 to-amber-500/5 px-6 py-2.5 font-cinzel text-[10.5px] font-semibold uppercase tracking-[0.3em] text-amber-200 transition-all duration-300 hover:border-amber-200/80 hover:bg-amber-400/15 hover:text-amber-100 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:border-amber-300/40 disabled:hover:bg-gradient-to-b disabled:hover:text-amber-200"
        >
          {existing ? 'Обнови' : 'Запази в дневника'}
          <span aria-hidden className="transition-transform duration-200 group-hover:translate-x-0.5">→</span>
        </button>
      </div>

      <AnimatePresence>
        {savedFlash && (
          <motion.p
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.4 }}
            className="text-right font-cinzel text-[10px] font-semibold uppercase tracking-[0.32em] text-amber-300/90"
          >
            ✦ Записано в дневника
          </motion.p>
        )}
      </AnimatePresence>
    </form>
  )
}

interface FieldProps {
  index: 0 | 1 | 2
  label: string
  placeholder: string
  value: string
  onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void
}

function Field({ index, label, placeholder, value, onChange }: FieldProps) {
  return (
    <div className="relative">
      <div className="mb-2 flex items-baseline gap-3">
        <span className="font-cinzel text-[9.5px] font-semibold uppercase tracking-[0.34em] text-amber-300/85">
          {romanize(index + 1)} · {label}
        </span>
        <span className="h-px flex-1 bg-gradient-to-r from-slate-400/20 via-slate-400/5 to-transparent" />
      </div>
      <textarea
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        rows={2}
        maxLength={500}
        className="w-full resize-none rounded-lg border border-slate-300/[0.08] bg-slate-900/30 px-4 py-3 font-display text-[15px] font-light leading-[1.75] text-slate-100 placeholder:font-light placeholder:text-slate-500/50 backdrop-blur-sm transition-colors duration-200 focus:border-amber-300/40 focus:bg-slate-900/50 focus:outline-none focus:ring-0"
      />
    </div>
  )
}

function romanize(n: number): string {
  return ['I', 'II', 'III'][n - 1] ?? String(n)
}
