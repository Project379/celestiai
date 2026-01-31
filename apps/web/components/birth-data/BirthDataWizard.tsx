'use client'

import { useState } from 'react'
import { useForm, FormProvider } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useRouter } from 'next/navigation'
import { birthDataSchema, type BirthData } from '@/lib/validators/birth-data'
import { DateStep } from './DateStep'
import { TimeStep } from './TimeStep'
import { LocationStep } from './LocationStep'
import { ConfirmStep } from './ConfirmStep'

const STEPS = ['date', 'time', 'location', 'confirm'] as const
type Step = (typeof STEPS)[number]

const STEP_LABELS: Record<Step, string> = {
  date: 'Дата',
  time: 'Час',
  location: 'Място',
  confirm: 'Преглед',
}

// Fields to validate per step
const STEP_FIELDS: Record<Step, (keyof BirthData)[]> = {
  date: ['name', 'birthDate'],
  time: ['birthTimeKnown', 'birthTime', 'approximateTimeRange'],
  location: ['cityName', 'latitude', 'longitude'],
  confirm: [], // Final step validates all
}

export function BirthDataWizard() {
  const router = useRouter()
  const [currentStep, setCurrentStep] = useState<number>(0)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)

  const methods = useForm<BirthData>({
    resolver: zodResolver(birthDataSchema),
    mode: 'onBlur',
    defaultValues: {
      name: '',
      birthDate: '',
      birthTimeKnown: true,
      birthTime: null,
      approximateTimeRange: null,
      cityId: null,
      cityName: '',
      latitude: 0,
      longitude: 0,
      manualCoordinates: false,
    },
  })

  const step = STEPS[currentStep]

  // Validate current step fields before advancing
  const validateStep = async (): Promise<boolean> => {
    const fields = STEP_FIELDS[step]
    if (fields.length === 0) return true

    const result = await methods.trigger(fields)
    return result
  }

  const nextStep = async () => {
    const isValid = await validateStep()
    if (isValid && currentStep < STEPS.length - 1) {
      setCurrentStep((prev) => prev + 1)
    }
  }

  const prevStep = () => {
    if (currentStep > 0) {
      setCurrentStep((prev) => prev - 1)
    }
  }

  const onSubmit = async (data: BirthData) => {
    setIsSubmitting(true)
    setSubmitError(null)

    try {
      const response = await fetch('/api/birth-data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Грешка при запазване')
      }

      // Success - redirect to dashboard
      router.push('/dashboard')
      router.refresh()
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : 'Неизвестна грешка')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <FormProvider {...methods}>
      <div className="mx-auto w-full max-w-md">
        {/* Progress bar */}
        <div className="mb-8">
          <div className="flex justify-between text-sm text-slate-400">
            {STEPS.map((s, index) => (
              <span
                key={s}
                className={`transition-colors ${
                  index <= currentStep ? 'text-purple-400' : ''
                }`}
              >
                {STEP_LABELS[s]}
              </span>
            ))}
          </div>
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-700/50">
            <div
              className="h-full rounded-full bg-gradient-to-r from-purple-500 to-violet-600 transition-all duration-300"
              style={{ width: `${((currentStep + 1) / STEPS.length) * 100}%` }}
            />
          </div>
        </div>

        {/* Form card */}
        <form onSubmit={methods.handleSubmit(onSubmit)}>
          <div className="rounded-xl border border-slate-700/50 bg-slate-800/30 p-6 backdrop-blur-sm">
            {/* Step content */}
            {step === 'date' && <DateStep onNext={nextStep} />}
            {step === 'time' && <TimeStep onNext={nextStep} onPrev={prevStep} />}
            {step === 'location' && <LocationStep onNext={nextStep} onPrev={prevStep} />}
            {step === 'confirm' && (
              <ConfirmStep
                onPrev={prevStep}
                isSubmitting={isSubmitting}
                submitError={submitError}
              />
            )}
          </div>
        </form>
      </div>
    </FormProvider>
  )
}
