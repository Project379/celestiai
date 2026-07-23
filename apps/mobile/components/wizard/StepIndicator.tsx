import { View } from 'react-native'

import { color } from '@/components/design-system/tokens'

/**
 * Mirrors apps/web/components/birth-data/BirthDataWizard.tsx step
 * indicator (lines 145-198), minus web's I·Дата → II·Час → III·Място →
 * IV·Преглед numerals: MOBILE_ALPHA_REDESIGN.md §19 found every wizard
 * screen repeats its own numeral as a second eyebrow, so this shared
 * component doubled it. R5 (§18, ratified) drops Roman numerals here in
 * favor of plain dots — no text, so the font-cinzel-on-Cyrillic problem
 * (REVISIT-42) that used to sit in these labels can't recur.
 *
 * Web uses gradient fills + glow shadows for the active state. Mobile
 * simplifies to flat amber tints (no gradients, no shadows) — RN doesn't
 * render web gradients without expo-linear-gradient and the editorial
 * intent (active step glows brighter, done is gold-tinted) survives the
 * simplification.
 */

const STEPS = [{}, {}, {}, {}] as const

export type WizardStep = 1 | 2 | 3 | 4

interface StepIndicatorProps {
  currentStep: WizardStep
}

export function StepIndicator({ currentStep }: StepIndicatorProps) {
  const progressPct = (currentStep / STEPS.length) * 100
  return (
    <View className="mb-10">
      <View className="mb-3 flex-row items-center" style={{ gap: 8 }}>
        {STEPS.map((_step, i) => {
          const stepNum = i + 1
          const isActive = stepNum === currentStep
          const isDone = stepNum < currentStep
          const isLast = i === STEPS.length - 1
          return (
            <View
              key={stepNum}
              className={`flex-row items-center ${isLast ? '' : 'flex-1'}`}
              style={{ gap: 8 }}
            >
              <View
                className="h-2 w-2 rounded-full"
                style={{
                  backgroundColor: isActive
                    ? color.amber
                    : isDone
                      ? 'rgba(251,191,36,0.4)'
                      : 'rgba(255,255,255,0.06)',
                }}
              />
              {!isLast && (
                <View
                  className={`h-px flex-1 ${
                    isDone ? 'bg-amber-300/40' : 'bg-white/[0.06]'
                  }`}
                />
              )}
            </View>
          )
        })}
      </View>
      <View className="h-px w-full bg-white/[0.05]">
        <View
          className="h-px bg-amber-300/60"
          style={{ width: `${progressPct}%` }}
        />
      </View>
    </View>
  )
}
