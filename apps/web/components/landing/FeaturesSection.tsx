import { CelestialIcon } from '@/components/icons/CelestialIcons'
import type { ComponentProps } from 'react'

type IconName = ComponentProps<typeof CelestialIcon>['name']

const features: {
  title: string
  description: string
  iconName: IconName
  premium: boolean
}[] = [
  {
    title: 'Натална карта',
    description: 'Виж картата си на раждане с точни планетарни позиции — интерактивна и красива.',
    iconName: 'rising',
    premium: false,
  },
  {
    title: 'AI Оракул',
    description: 'Получи лични тълкувания за любов, кариера и здраве — написани специално за теб от AI.',
    iconName: 'moon',
    premium: true,
  },
  {
    title: 'Дневен хороскоп',
    description: 'Всеки ден ти подготвяме прогноза, базирана точно на твоята карта. С Премиум — пълен достъп.',
    iconName: 'sun',
    premium: true,
  },
  {
    title: 'Известия',
    description: 'Получавай сутрешно известие, за да не пропуснеш дневния си хороскоп.',
    iconName: 'mercury',
    premium: false,
  },
]

export function FeaturesSection() {
  return (
    <section id="features" className="relative py-24">
      {/* Ambient atmosphere */}
      <div
        aria-hidden
        className="pointer-events-none absolute -left-20 top-40 -z-10 h-[360px] w-[360px] rounded-full bg-violet-500/[0.08] blur-[110px]"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -right-20 bottom-20 -z-10 h-[280px] w-[280px] rounded-full bg-amber-500/[0.06] blur-[95px]"
      />

      <div className="container mx-auto max-w-4xl px-4">
        {/* Editorial header */}
        <div className="mb-14 text-center">
          <div className="mb-4 flex items-center justify-center gap-3" aria-hidden>
            <span className="h-px w-14 bg-gradient-to-r from-transparent to-amber-300/50" />
            <span className="h-1 w-1 rotate-45 bg-amber-300/80 shadow-[0_0_8px_rgba(251,191,36,0.6)]" />
            <span className="h-px w-14 bg-gradient-to-l from-transparent to-amber-300/50" />
          </div>
          <p className="mb-4 font-cinzel text-[10px] font-semibold uppercase tracking-[0.42em] text-slate-500">
            Функции
          </p>
          <h2 className="font-display text-[2rem] font-semibold leading-[1.15] tracking-tight text-slate-100 sm:text-[2.5rem]">
            <span className="font-light italic text-slate-400">Всичко, което </span>
            <span className="bg-gradient-to-br from-white via-slate-100 to-amber-200/90 bg-clip-text text-transparent drop-shadow-[0_0_24px_rgba(251,191,36,0.15)]">
              ти трябва.
            </span>
          </h2>
          <p className="mx-auto mt-5 max-w-xl font-display text-[15.5px] font-light italic leading-relaxed text-slate-400">
            За да разбереш какво точно ти казват звездите.
          </p>
        </div>

        {/* Editorial dictionary grid — hairlines, no boxes */}
        <dl className="grid gap-x-12 border-t border-white/[0.06] sm:grid-cols-2">
          {features.map((feature) => (
            <div
              key={feature.title}
              className="group relative flex items-start gap-5 border-b border-white/[0.06] py-7"
            >
              {/* Icon */}
              <div className="relative mt-1 flex h-11 w-11 shrink-0 items-center justify-center text-violet-300/85 transition-colors group-hover:text-amber-200">
                <span
                  aria-hidden
                  className="absolute inset-0 -z-10 rounded-full bg-violet-500/[0.10] blur-md transition-opacity group-hover:bg-amber-500/[0.15]"
                />
                <CelestialIcon name={feature.iconName} size={26} />
              </div>

              <div className="flex-1">
                <div className="flex items-baseline gap-3">
                  <dt className="font-display text-[17px] font-semibold text-slate-100">
                    {feature.title}
                  </dt>
                  {feature.premium && (
                    <span className="inline-flex items-center gap-1.5 font-cinzel text-[8.5px] font-semibold uppercase tracking-[0.28em] text-amber-300/80">
                      <span aria-hidden className="h-1 w-1 rotate-45 bg-amber-300/80 shadow-[0_0_6px_rgba(251,191,36,0.55)]" />
                      Premium
                    </span>
                  )}
                </div>
                <dd className="mt-2 font-display text-[13.5px] italic leading-[1.75] text-slate-400/90">
                  {feature.description}
                </dd>
              </div>
            </div>
          ))}
        </dl>
      </div>
    </section>
  )
}
