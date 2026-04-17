'use client'

import { useState } from 'react'
import { useForm, FormProvider } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
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

const STEP_NUMERALS = ['I', 'II', 'III', 'IV'] as const

const STEP_FIELDS: Record<Step, (keyof BirthData)[]> = {
  date: ['name', 'birthDate'],
  time: ['birthTimeKnown', 'birthTime', 'approximateTimeRange'],
  location: ['cityName', 'latitude', 'longitude'],
  confirm: [],
}

const fadeUp = {
  hidden: { opacity: 0, y: 14, filter: 'blur(6px)' },
  visible: {
    opacity: 1,
    y: 0,
    filter: 'blur(0px)',
    transition: { duration: 0.5, ease: [0.22, 0.68, 0.35, 1] as const },
  },
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

  const validateStep = async (): Promise<boolean> => {
    const fields = STEP_FIELDS[step]
    if (fields.length === 0) return true
    return methods.trigger(fields)
  }

  const nextStep = async () => {
    if ((await validateStep()) && currentStep < STEPS.length - 1) {
      setCurrentStep((prev) => prev + 1)
    }
  }

  const prevStep = () => {
    if (currentStep > 0) setCurrentStep((prev) => prev - 1)
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

      router.push('/dashboard')
      router.refresh()
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : 'Неизвестна грешка')
    } finally {
      setIsSubmitting(false)
    }
  }

  const progress = ((currentStep + 1) / STEPS.length) * 100

  return (
    <FormProvider {...methods}>
      <div className="relative mx-auto w-full max-w-lg">
        {/* Ambient atmosphere */}
        <div
          aria-hidden
          className="pointer-events-none absolute -left-32 -top-32 -z-10 h-[440px] w-[440px] rounded-full bg-violet-500/[0.08] blur-[100px]"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -right-16 top-32 -z-10 h-[260px] w-[260px] rounded-full bg-amber-500/[0.05] blur-[90px]"
        />

        {/* Hero */}
        <motion.header
          initial="hidden"
          animate="visible"
          variants={fadeUp}
          className="mb-12"
        >
          <p className="mb-3 font-cinzel text-[10px] font-semibold uppercase tracking-[0.42em] text-slate-500">
            Начало
          </p>
          <h1 className="font-display text-[2rem] leading-[1.12] tracking-tight sm:text-[2.375rem]">
            <span className="font-light text-slate-400">Създай своята </span>
            <span className="bg-gradient-to-br from-white via-slate-100 to-amber-200/90 bg-clip-text font-semibold text-transparent drop-shadow-[0_0_28px_rgba(251,191,36,0.18)]">
              карта.
            </span>
          </h1>
          <p className="mt-5 max-w-md font-display text-[16px] font-light leading-[1.8] text-slate-400">
            Три параметъра определят всичко - датата, часът и мястото на раждането ти.
          </p>
        </motion.header>

        {/* Step indicator - Roman numerals connected by hairlines */}
        <motion.div
          initial="hidden"
          animate="visible"
          variants={fadeUp}
          className="mb-10"
        >
          <div className="mb-4 flex items-center justify-between gap-2">
            {STEPS.map((s, index) => {
              const isActive = index === currentStep
              const isDone = index < currentStep
              return (
                <div key={s} className="flex flex-1 items-center gap-2">
                  <div className="flex flex-col items-center gap-1.5">
                    <span
                      className={`flex h-7 w-7 items-center justify-center rounded-full border font-cinzel text-[9px] font-bold tracking-[0.12em] transition-all duration-300 ${
                        isActive
                          ? 'border-amber-300/70 bg-gradient-to-br from-violet-500/15 to-amber-400/[0.08] text-amber-200 shadow-[0_0_16px_rgba(251,191,36,0.25)]'
                          : isDone
                            ? 'border-amber-300/40 text-amber-300/80'
                            : 'border-white/[0.06] text-slate-600'
                      }`}
                    >
                      {STEP_NUMERALS[index]}
                    </span>
                    <span
                      className={`font-cinzel text-[9px] font-semibold uppercase tracking-[0.26em] transition-colors ${
                        isActive ? 'text-amber-200' : isDone ? 'text-slate-400' : 'text-slate-600'
                      }`}
                    >
                      {STEP_LABELS[s]}
                    </span>
                  </div>
                  {index < STEPS.length - 1 && (
                    <span
                      aria-hidden
                      className={`h-px flex-1 transition-colors duration-500 ${
                        isDone ? 'bg-amber-300/40' : 'bg-white/[0.06]'
                      }`}
                    />
                  )}
                </div>
              )
            })}
          </div>

          {/* Thin progress hairline */}
          <div className="relative h-px w-full bg-white/[0.05]">
            <div
              className="absolute inset-y-0 left-0 bg-gradient-to-r from-violet-400/60 via-amber-300/70 to-amber-300/70 transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
        </motion.div>

        {/* Step content - no card frame, editorial flow */}
        <motion.form
          key={step}
          initial="hidden"
          animate="visible"
          variants={fadeUp}
          onSubmit={methods.handleSubmit(onSubmit)}
        >
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
        </motion.form>
      </div>
    </FormProvider>
  )
}
