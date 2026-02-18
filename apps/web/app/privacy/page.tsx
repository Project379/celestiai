import Link from 'next/link'
import { GlassCard, Text } from '@celestia/ui'

/**
 * /privacy — Public GDPR-compliant privacy policy page in Bulgarian.
 * Accessible without authentication.
 */
export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-[#0a0a1a] via-[#0f0e2a] to-[#0a0a1a] px-4 py-12">
      <div className="mx-auto max-w-3xl">
        <Link
          href="/"
          className="mb-8 inline-flex items-center gap-2 text-sm text-white/60 transition-colors hover:text-white"
        >
          &larr; Начало
        </Link>

        <GlassCard>
          <Text variant="h1" className="mb-8">
            Политика за поверителност
          </Text>

          <div className="space-y-8 text-white/80">
            {/* What data we collect */}
            <section>
              <Text variant="h2" className="mb-3">
                Какви данни събираме
              </Text>
              <ul className="list-disc space-y-1.5 pl-5 text-sm leading-relaxed text-white/70">
                <li>Дата, час и място на раждане (за генериране на астрологична карта)</li>
                <li>Изчисления на натална карта и аспекти</li>
                <li>AI-генерирани четения и тълкувания</li>
                <li>История на дневни хороскопи</li>
                <li>Абонаменти за push известия (endpoint, ключове)</li>
                <li>Информация за плащане (управлявана изцяло от Stripe — ние не съхраняваме номера на карти)</li>
              </ul>
            </section>

            {/* How we use data */}
            <section>
              <Text variant="h2" className="mb-3">
                Как използваме данните
              </Text>
              <ul className="list-disc space-y-1.5 pl-5 text-sm leading-relaxed text-white/70">
                <li>За генериране на персонализирано астрологично съдържание</li>
                <li>За обработка на плащания чрез Stripe</li>
                <li>За изпращане на push известия за дневен хороскоп</li>
              </ul>
            </section>

            {/* Storage and security */}
            <section>
              <Text variant="h2" className="mb-3">
                Съхранение и сигурност
              </Text>
              <p className="text-sm leading-relaxed text-white/70">
                Вашите данни се съхраняват в Supabase (PostgreSQL) с криптиране в покой.
                Достъпът е защитен чрез Row Level Security (RLS) политики и HTTPS
                криптиране при пренос. Автентикацията се управлява от Clerk с
                индустриални стандарти за сигурност.
              </p>
            </section>

            {/* Your rights */}
            <section>
              <Text variant="h2" className="mb-3">
                Вашите права
              </Text>
              <ul className="list-disc space-y-1.5 pl-5 text-sm leading-relaxed text-white/70">
                <li>
                  <strong className="text-white/90">Право на експорт на данни</strong> — Можете да
                  изтеглите всички ваши данни по всяко време чрез моментален JSON файл от
                  настройките за поверителност.
                </li>
                <li>
                  <strong className="text-white/90">Право на изтриване на акаунт</strong> — Можете да
                  заявите изтриване на акаунта си с 30-дневен гратисен период, през който
                  можете да отмените заявката.
                </li>
                <li>
                  <strong className="text-white/90">Право на отмяна на изтриване</strong> — През
                  гратисния период от 30 дни можете да възстановите акаунта си по всяко време.
                </li>
              </ul>
            </section>

            {/* Cookies */}
            <section>
              <Text variant="h2" className="mb-3">
                Бисквитки
              </Text>
              <p className="text-sm leading-relaxed text-white/70">
                Използваме сесийни бисквитки чрез Clerk за автентикация. Не използваме
                бисквитки за проследяване или рекламни цели.
              </p>
            </section>

            {/* Contact */}
            <section>
              <Text variant="h2" className="mb-3">
                Контакт
              </Text>
              <p className="text-sm leading-relaxed text-white/70">
                За въпроси относно поверителността на данните, моля свържете се с нас
                на{' '}
                <a
                  href="mailto:support@celestia.app"
                  className="text-purple-400 underline transition-colors hover:text-purple-300"
                >
                  support@celestia.app
                </a>
                .
              </p>
            </section>

            {/* Changes */}
            <section>
              <Text variant="h2" className="mb-3">
                Промени
              </Text>
              <p className="text-sm leading-relaxed text-white/70">
                Запазваме си правото да актуализираме тази политика. При съществени
                промени ще бъдете уведомени чрез приложението.
              </p>
              <p className="mt-2 text-xs text-white/40">
                Последна актуализация: 18 февруари 2026 г.
              </p>
            </section>
          </div>
        </GlassCard>
      </div>
    </div>
  )
}
