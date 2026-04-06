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
                Celestia AI е твоят личен астрологичен приятел — създаден
                специално за българи. Комбинираме вековната мъдрост на
                астрологията с най-новите технологии, за да ти дадем нещо
                наистина полезно.
              </Text>

              <Text variant="body" className="text-slate-300">
                Вярваме, че астрологията трябва да е достъпна, точна и лична.
                Затова използваме Swiss Ephemeris за прецизни изчисления и AI
                модели, които пишат тълкувания специално за теб.
              </Text>

              <Text variant="body" className="text-slate-300">
                Звездите имат какво да ти кажат за живота, връзките и
                потенциала ти. С Celestia тези прозрения са само на един клик
                разстояние.
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
