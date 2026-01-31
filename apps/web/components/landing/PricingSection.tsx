import { GlassCard, Text } from '@celestia/ui'
import Link from 'next/link'

export function PricingSection() {
  const plans = [
    {
      name: 'Безплатен',
      price: '0',
      period: 'завинаги',
      description: 'Идеален за начинаещи',
      features: [
        'Основна натална карта',
        'Дневен хороскоп',
        'Позиции на планетите',
        'Основни аспекти',
      ],
      cta: 'Започнете безплатно',
      highlight: false,
    },
    {
      name: 'Премиум',
      price: '9.99',
      period: 'месец',
      description: 'За сериозни ентусиасти',
      features: [
        'Всичко от Безплатен план',
        'Детайлна натална карта',
        'AI персонализирани тълкувания',
        'Транзити и прогресии',
        'Съвместимост партньори',
        'Приоритетна поддръжка',
      ],
      cta: 'Опитайте Премиум',
      highlight: true,
    },
  ]

  return (
    <section id="pricing" className="py-20">
      <div className="container mx-auto px-4">
        <div className="mb-12 text-center">
          <Text variant="h2" className="mb-4">
            Цени
          </Text>
          <Text variant="muted" className="mx-auto max-w-2xl">
            Изберете плана, който отговаря на вашите нужди. Без скрити такси.
          </Text>
        </div>

        <div className="mx-auto grid max-w-4xl grid-cols-1 gap-8 md:grid-cols-2">
          {plans.map((plan) => (
            <GlassCard
              key={plan.name}
              className={`relative flex flex-col ${
                plan.highlight
                  ? 'border-purple-500/50 ring-2 ring-purple-500/20'
                  : ''
              }`}
            >
              {plan.highlight && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-gradient-to-r from-purple-600 to-violet-600 px-4 py-1 text-xs font-medium text-white">
                  Популярен
                </div>
              )}

              <div className="mb-6 text-center">
                <Text variant="h3" className="mb-2">
                  {plan.name}
                </Text>
                <div className="flex items-baseline justify-center gap-1">
                  <span className="text-4xl font-bold text-white">
                    {plan.price}
                  </span>
                  <span className="text-slate-400">лв/{plan.period}</span>
                </div>
                <Text variant="muted" className="mt-2">
                  {plan.description}
                </Text>
              </div>

              <ul className="mb-8 flex-grow space-y-3">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-center gap-3">
                    <svg
                      className="h-5 w-5 flex-shrink-0 text-purple-400"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                    <span className="text-slate-300">{feature}</span>
                  </li>
                ))}
              </ul>

              <Link
                href="/auth"
                className={`block w-full rounded-lg py-3 text-center font-medium transition-all ${
                  plan.highlight
                    ? 'bg-gradient-to-r from-purple-600 to-violet-600 text-white hover:from-purple-500 hover:to-violet-500'
                    : 'border border-slate-700 text-slate-300 hover:border-slate-600 hover:text-white'
                }`}
              >
                {plan.cta}
              </Link>
            </GlassCard>
          ))}
        </div>
      </div>
    </section>
  )
}
