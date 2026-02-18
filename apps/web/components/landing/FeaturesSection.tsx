import { GlassCard, Text } from '@celestia/ui'
import { Star, Sparkles, Calendar, Bell } from 'lucide-react'

const features = [
  {
    title: 'Натална карта',
    description:
      'Разкрийте вашата уникална астрологична карта на раждане с точни планетарни позиции и интерактивна визуализация.',
    icon: <Star className="h-8 w-8 text-purple-400" />,
    premium: false,
  },
  {
    title: 'AI Оракул',
    description:
      'Интелигентни персонализирани тълкувания за любов, кариера и здраве, създадени от изкуствен интелект.',
    icon: <Sparkles className="h-8 w-8 text-violet-400" />,
    premium: true,
  },
  {
    title: 'Дневен хороскоп',
    description:
      'Персонализирани дневни прогнози базирани на транзитите към вашата натална карта. Пълен достъп с Премиум.',
    icon: <Calendar className="h-8 w-8 text-indigo-400" />,
    premium: true,
  },
  {
    title: 'Известия',
    description:
      'Получавайте сутрешно известие, за да не пропуснете вашия дневен хороскоп.',
    icon: <Bell className="h-8 w-8 text-amber-400" />,
    premium: false,
  },
]

export function FeaturesSection() {
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

        <div className="mx-auto grid max-w-4xl grid-cols-1 gap-6 md:grid-cols-2">
          {features.map((feature) => (
            <GlassCard key={feature.title} className="relative text-center">
              {feature.premium && (
                <span className="absolute -top-2 -right-2 rounded-full bg-gradient-to-r from-purple-600 to-violet-600 px-2.5 py-0.5 text-xs font-medium text-white">
                  Premium
                </span>
              )}
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
