import { Text, View } from 'react-native'

/**
 * Mirrors apps/web/components/birth-data/BirthDataWizard.tsx step
 * indicator (lines 145-198): I·Дата → II·Час → III·Място → IV·Преглед
 * with a hairline progress bar below.
 *
 * Web uses gradient fills + glow shadows for the active state. Mobile
 * simplifies to flat amber tints (no gradients, no shadows) — RN doesn't
 * render web gradients without expo-linear-gradient and the editorial
 * intent (active step glows brighter, done is gold-tinted) survives the
 * simplification.
 */

const STEPS = [
  { numeral: 'I', label: 'Дата' },
  { numeral: 'II', label: 'Час' },
  { numeral: 'III', label: 'Място' },
  { numeral: 'IV', label: 'Преглед' },
] as const

export type WizardStep = 1 | 2 | 3 | 4

interface StepIndicatorProps {
  currentStep: WizardStep
}

export function StepIndicator({ currentStep }: StepIndicatorProps) {
  const progressPct = (currentStep / STEPS.length) * 100
  return (
    <View className="mb-10">
      <View className="mb-3 flex-row items-center" style={{ gap: 8 }}>
        {STEPS.map((step, i) => {
          const stepNum = i + 1
          const isActive = stepNum === currentStep
          const isDone = stepNum < currentStep
          const isLast = i === STEPS.length - 1
          return (
            <View
              key={step.numeral}
              className={`flex-row items-center ${isLast ? '' : 'flex-1'}`}
              style={{ gap: 8 }}
            >
              <View className="items-center" style={{ gap: 6 }}>
                <View
                  className={`h-7 w-7 items-center justify-center rounded-full border ${
                    isActive
                      ? 'border-amber-300/70 bg-amber-400/10'
                      : isDone
                        ? 'border-amber-300/40'
                        : 'border-white/[0.06]'
                  }`}
                >
                  <Text
                    className={`font-cinzel text-[9px] font-bold tracking-[0.12em] ${
                      isActive
                        ? 'text-amber-200'
                        : isDone
                          ? 'text-amber-300/80'
                          : 'text-slate-600'
                    }`}
                  >
                    {step.numeral}
                  </Text>
                </View>
                <Text
                  className={`font-cinzel text-[9px] font-semibold uppercase tracking-[0.26em] ${
                    isActive
                      ? 'text-amber-200'
                      : isDone
                        ? 'text-slate-400'
                        : 'text-slate-600'
                  }`}
                >
                  {step.label}
                </Text>
              </View>
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
