import Link from 'next/link'

const plans = [
  {
    name: 'Безплатен',
    numeral: 'I',
    price: '0',
    period: 'завинаги',
    description: 'Идеален за първи стъпки',
    features: [
      'Основна натална карта',
      'Дневен хороскоп',
      'Позиции на планетите',
      'Основни аспекти',
    ],
    cta: 'Започни безплатно',
    highlight: false,
  },
  {
    name: 'Премиум',
    numeral: 'II',
    price: '6.99',
    period: 'месец',
    description: 'За любителите на звездите',
    features: [
      'Всичко от Безплатен план',
      'Детайлна натална карта',
      'AI персонализирани тълкувания',
      'Транзити и прогресии',
      'Съвместимост партньори',
      'Приоритетна поддръжка',
    ],
    cta: 'Опитай Премиум',
    highlight: true,
  },
]

export function PricingSection() {
  return (
    <section id="pricing" className="relative py-24">
      {/* Ambient atmosphere */}
      <div
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-20 -z-10 h-[400px] w-[400px] -translate-x-1/2 rounded-full bg-violet-500/[0.08] blur-[120px]"
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
            Цени
          </p>
          <h2 className="font-display text-[2rem] font-semibold leading-[1.15] tracking-tight text-slate-100 sm:text-[2.5rem]">
            <span className="font-light italic text-slate-400">Избери плана, </span>
            <span className="bg-gradient-to-br from-white via-slate-100 to-amber-200/90 bg-clip-text text-transparent drop-shadow-[0_0_24px_rgba(251,191,36,0.15)]">
              който ти подхожда.
            </span>
          </h2>
          <p className="mx-auto mt-5 max-w-xl font-display text-[15.5px] font-light italic leading-relaxed text-slate-400">
            Без скрити такси. Без изненади.
          </p>
        </div>

        {/* Editorial plan cards - hairlines over ambient glow, not glass cards */}
        <div className="grid gap-6 md:grid-cols-2 md:gap-8">
          {plans.map((plan) => (
            <article
              key={plan.name}
              className={`group relative flex flex-col overflow-hidden rounded-2xl border px-7 py-8 backdrop-blur-sm transition-all ${
                plan.highlight
                  ? 'border-amber-300/40 bg-gradient-to-br from-violet-500/[0.08] via-transparent to-amber-400/[0.06] shadow-[0_0_38px_rgba(167,139,250,0.12)]'
                  : 'border-white/[0.06] bg-white/[0.015] hover:border-violet-300/25 hover:bg-white/[0.03]'
              }`}
            >
              {/* Highlight badge */}
              {plan.highlight && (
                <div className="absolute -top-[1px] left-1/2 flex -translate-x-1/2 items-center gap-2 border-x border-b border-amber-300/40 bg-gradient-to-r from-violet-500/15 via-[#08060f] to-amber-400/15 px-4 py-1.5 font-cinzel text-[9px] font-semibold uppercase tracking-[0.34em] text-amber-200">
                  <span aria-hidden className="h-1 w-1 rotate-45 bg-amber-300/90 shadow-[0_0_8px_rgba(251,191,36,0.7)]" />
                  Популярен
                  <span aria-hidden className="h-1 w-1 rotate-45 bg-amber-300/90 shadow-[0_0_8px_rgba(251,191,36,0.7)]" />
                </div>
              )}

              {/* Header */}
              <div className="mb-7 mt-4 text-center">
                <p className="mb-3 font-cinzel text-[10px] font-semibold uppercase tracking-[0.42em] text-amber-300/75">
                  {plan.numeral} · {plan.name}
                </p>
                <div className="flex items-baseline justify-center gap-2">
                  <span className="font-display text-[3rem] font-light leading-none tracking-tight text-slate-100 sm:text-[3.5rem]">
                    <span className="bg-gradient-to-br from-white via-slate-100 to-amber-200/90 bg-clip-text text-transparent">
                      {plan.price}
                    </span>
                  </span>
                  <span className="font-cinzel text-[10px] font-semibold uppercase tracking-[0.28em] text-slate-500">
                    €/{plan.period}
                  </span>
                </div>
                <p className="mt-3 font-display text-[13px] italic text-slate-400">
                  {plan.description}
                </p>
              </div>

              {/* Feature list - hairline rows with amber diamond bullets */}
              <ul className="mb-8 flex-grow space-y-3 border-y border-white/[0.05] py-5">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-start gap-3">
                    <span
                      aria-hidden
                      className="mt-[7px] h-1 w-1 shrink-0 rotate-45 bg-amber-300/80 shadow-[0_0_6px_rgba(251,191,36,0.55)]"
                    />
                    <span className="font-display text-[14px] leading-relaxed text-slate-300/90">
                      {feature}
                    </span>
                  </li>
                ))}
              </ul>

              {/* CTA */}
              <Link
                href="/sign-up"
                className={`group/btn relative inline-flex items-center justify-center gap-3 overflow-hidden rounded-full border px-6 py-3 font-cinzel text-[10.5px] font-semibold uppercase tracking-[0.32em] transition-all ${
                  plan.highlight
                    ? 'border-amber-300/60 bg-gradient-to-r from-violet-500/15 via-transparent to-amber-400/15 text-amber-100 hover:border-amber-300/90 hover:text-white hover:shadow-[0_0_28px_rgba(251,191,36,0.22)]'
                    : 'border-white/[0.10] text-slate-300 hover:border-violet-300/40 hover:text-slate-100'
                }`}
              >
                <span
                  aria-hidden
                  className="pointer-events-none absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-amber-200/15 to-transparent transition-transform duration-700 group-hover/btn:translate-x-full"
                />
                <span className="relative">{plan.cta}</span>
              </Link>
            </article>
          ))}
        </div>
      </div>
    </section>
  )
}
