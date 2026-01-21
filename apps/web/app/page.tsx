import { GlassCard, Text } from '@celestia/ui'

export default function HomePage() {
  return (
    <main className="min-h-screen p-4 md:p-8 lg:p-12">
      {/* Hero section */}
      <section className="text-center mb-12">
        <Text variant="h1" className="mb-4 bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
          Celestia AI
        </Text>
        <Text variant="muted" className="max-w-2xl mx-auto">
          Вашият персонален астрологичен спътник. Открийте тайните на звездите.
        </Text>
      </section>

      {/* Feature cards - responsive grid */}
      {/* Mobile: 1 column, Tablet: 2 columns, Desktop: 3 columns (UI-03) */}
      <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
        <GlassCard>
          <Text variant="h3" className="mb-2">
            Натална карта
          </Text>
          <Text variant="muted">
            Разкрийте вашата уникална астрологична карта на раждане с точни планетарни позиции.
          </Text>
        </GlassCard>

        <GlassCard>
          <Text variant="h3" className="mb-2">
            Дневен хороскоп
          </Text>
          <Text variant="muted">
            Персонализирани дневни прогнози базирани на вашата натална карта и текущите транзити.
          </Text>
        </GlassCard>

        <GlassCard>
          <Text variant="h3" className="mb-2">
            AI Оракул
          </Text>
          <Text variant="muted">
            Интелигентни астрологични тълкувания, създадени специално за вас.
          </Text>
        </GlassCard>
      </section>

      {/* Footer */}
      <footer className="text-center mt-16">
        <Text variant="muted">
          &copy; 2026 Celestia AI. Всички права запазени.
        </Text>
      </footer>
    </main>
  )
}
