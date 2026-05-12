import { useEffect, useState } from 'react'
import { Pressable, Text, TextInput, View } from 'react-native'

import type { LunarPhase } from '@stellaeum/core/moon-phase'
import { getManifestPrompt } from '@stellaeum/core/diary/prompts'
import type { ManifestEntry } from '@stellaeum/core/diary/types'

interface ManifestEntryFormProps {
  phase: LunarPhase
  today: string
  existing: ManifestEntry | null
  entryCountForPhase: number
  onSave: (intentions: [string, string, string]) => void
}

/**
 * Лунен дневник — three-field intention form, phase-driven prompt.
 * Mirrors apps/web/components/manifest/ManifestEntryForm.tsx (P.4-c1).
 *
 * Prompt heading/lead/fieldLabels/placeholders come from
 * @stellaeum/core/diary/prompts via getManifestPrompt() — 24 variants
 * cycle by per-phase entry count (entryCountForPhase % variants.length).
 * Mobile and web pull from the same module after the P.4-a lift.
 */
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

  // Seed form from existing entry when it loads (matches web hook's async
  // hydration pattern; existing flips from null to non-null after the
  // TanStack query resolves).
  useEffect(() => {
    if (existing) setValues([...existing.intentions])
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [existing?.id])

  const handleChange = (index: 0 | 1 | 2) => (text: string) => {
    const next: [string, string, string] = [...values] as [string, string, string]
    next[index] = text
    setValues(next)
  }

  const allFilled = values.every((v) => v.trim().length > 0)

  const handleSubmit = () => {
    if (!allFilled) return
    onSave(values.map((v) => v.trim()) as [string, string, string])
    setSavedFlash(true)
    setTimeout(() => setSavedFlash(false), 2400)
  }

  return (
    <View style={{ gap: 28 }}>
      <View>
        <Text className="mb-2 font-cinzel text-[10px] font-semibold uppercase tracking-[0.38em] text-amber-300/90">
          {prompt.heading}
        </Text>
        <Text className="text-[15.5px] font-light leading-[1.8] text-slate-300">
          {prompt.lead}
        </Text>
        <Text className="mt-3 font-cinzel text-[9.5px] uppercase tracking-[0.3em] text-slate-500">
          {phase.name} · {today}
        </Text>
      </View>

      <View style={{ gap: 24 }}>
        {[0, 1, 2].map((i) => {
          const idx = i as 0 | 1 | 2
          return (
            <Field
              key={i}
              index={idx}
              label={prompt.fieldLabels[idx]}
              placeholder={prompt.placeholders[idx]}
              value={values[idx]}
              onChangeText={handleChange(idx)}
            />
          )
        })}
      </View>

      <View
        className="flex-row items-center justify-between border-t border-slate-300/[0.08] pt-6"
        style={{ gap: 16 }}
      >
        <Text className="flex-1 text-[12.5px] font-light leading-[1.75] text-slate-500">
          {existing
            ? 'Вече писа днес — можеш да поправяш, докато цикълът не се смени.'
            : 'Запази, когато и трите са готови.'}
        </Text>
        <Pressable
          onPress={handleSubmit}
          disabled={!allFilled}
          className={`flex-row items-center rounded-full border px-5 py-2.5 ${
            allFilled
              ? 'border-amber-300/40 bg-amber-300/[0.06]'
              : 'border-slate-700/60 bg-slate-900/40'
          }`}
          style={{ gap: 10 }}
        >
          <Text
            className={`font-cinzel text-[10.5px] font-semibold uppercase tracking-[0.3em] ${
              allFilled ? 'text-amber-200' : 'text-slate-600'
            }`}
          >
            {existing ? 'Обнови' : 'Запази в дневника'}
          </Text>
          <Text
            className={`font-cinzel text-[10.5px] ${
              allFilled ? 'text-amber-300' : 'text-slate-700'
            }`}
          >
            →
          </Text>
        </Pressable>
      </View>

      {savedFlash && (
        <Text className="text-right font-cinzel text-[10px] font-semibold uppercase tracking-[0.32em] text-amber-300/90">
          ✦ Записано в дневника
        </Text>
      )}
    </View>
  )
}

interface FieldProps {
  index: 0 | 1 | 2
  label: string
  placeholder: string
  value: string
  onChangeText: (text: string) => void
}

function Field({ index, label, placeholder, value, onChangeText }: FieldProps) {
  return (
    <View>
      <View className="mb-2 flex-row items-baseline" style={{ gap: 12 }}>
        <Text className="font-cinzel text-[9.5px] font-semibold uppercase tracking-[0.34em] text-amber-300/85">
          {romanize(index + 1)} · {label}
        </Text>
        <View className="h-px flex-1 bg-slate-400/15" />
      </View>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor="rgba(100,116,139,0.5)"
        multiline
        numberOfLines={2}
        maxLength={500}
        textAlignVertical="top"
        className="rounded-lg border border-slate-300/[0.08] bg-slate-900/30 px-4 py-3 text-[15px] font-light leading-[1.75] text-slate-100"
        style={{ minHeight: 70 }}
      />
    </View>
  )
}

function romanize(n: number): string {
  return ['I', 'II', 'III'][n - 1] ?? String(n)
}
