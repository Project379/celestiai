import { GlassCard, Text } from '@celestia/ui'

export function FeaturesSection() {
  const features = [
    {
      title: 'Натална карта',
      description:
        'Разкрийте вашата уникална астрологична карта на раждане с точни планетарни позиции.',
      icon: (
        <svg
          className="h-8 w-8 text-purple-400"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"
          />
        </svg>
      ),
    },
    {
      title: 'Дневен хороскоп',
      description:
        'Персонализирани дневни прогнози базирани на вашата натална карта и текущите транзити.',
      icon: (
        <svg
          className="h-8 w-8 text-violet-400"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
          />
        </svg>
      ),
    },
    {
      title: 'AI Оракул',
      description:
        'Интелигентни астрологични тълкувания, създадени специално за вас.',
      icon: (
        <svg
          className="h-8 w-8 text-indigo-400"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
          />
        </svg>
      ),
    },
  ]

  return (
    <section id="features" className="py-20">
      <div className="container mx-auto px-4">
        <div className="mb-12 text-center">
          <Text variant="h2" className="mb-4">
            Функции
          </Text>
          <Text variant="muted" className="mx-auto max-w-2xl">
            Открийте пълния потенциал на вашата астрологична карта с нашите
            мощни инструменти.
          </Text>
        </div>

        <div className="mx-auto grid max-w-6xl grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {features.map((feature) => (
            <GlassCard key={feature.title} className="text-center">
              <div className="mb-4 flex justify-center">{feature.icon}</div>
              <Text variant="h3" className="mb-2">
                {feature.title}
              </Text>
              <Text variant="muted">{feature.description}</Text>
            </GlassCard>
          ))}
        </div>
      </div>
    </section>
  )
}
