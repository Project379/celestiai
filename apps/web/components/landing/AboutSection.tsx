import { GlassCard, Text } from '@celestia/ui'

export function AboutSection() {
  return (
    <section id="about" className="py-20">
      <div className="container mx-auto px-4">
        <div className="mx-auto max-w-3xl">
          <GlassCard className="text-center">
            <Text variant="h2" className="mb-6">
              За нас
            </Text>

            <div className="space-y-4">
              <Text variant="body" className="text-slate-300">
                Celestia AI е вашият персонален астрологичен спътник, създаден
                специално за българската аудитория. Ние комбинираме вековната
                мъдрост на астрологията с най-новите технологии за изкуствен
                интелект.
              </Text>

              <Text variant="body" className="text-slate-300">
                Нашата мисия е да направим астрологията достъпна, точна и
                персонализирана. Използваме Swiss Ephemeris за прецизни
                астрономически изчисления и AI модели за интелигентни
                тълкувания.
              </Text>

              <Text variant="body" className="text-slate-300">
                Вярваме, че звездите могат да ни дадат ценни прозрения за нашия
                живот, взаимоотношения и потенциал. С Celestia AI тези прозрения
                са на една ръка разстояние.
              </Text>
            </div>

            <div className="mt-8 flex justify-center gap-8">
              <div className="text-center">
                <div className="text-3xl font-bold text-purple-400">10k+</div>
                <Text variant="muted">Потребители</Text>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-violet-400">50k+</div>
                <Text variant="muted">Карти</Text>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-indigo-400">99.9%</div>
                <Text variant="muted">Точност</Text>
              </div>
            </div>
          </GlassCard>
        </div>
      </div>
    </section>
  )
}
