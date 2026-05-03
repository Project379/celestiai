import Link from 'next/link'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Политика за поверителност',
  description: 'Как Stellaeum AI събира, използва и защитава личните ти данни',
}

function SectionHeader({ numeral, eyebrow, title }: { numeral: string; eyebrow: string; title: string }) {
  return (
    <header className="mb-5">
      <p className="mb-2 flex items-center gap-3 font-cinzel text-[10px] font-semibold uppercase tracking-[0.42em]">
        <span className="text-amber-300/80">{numeral}</span>
        <span aria-hidden className="h-px w-8 bg-gradient-to-r from-amber-300/60 to-transparent" />
        <span className="text-slate-500">{eyebrow}</span>
      </p>
      <h2 className="font-display text-[1.5rem] font-semibold leading-tight tracking-tight text-slate-100">
        {title}
      </h2>
    </header>
  )
}

export default function PrivacyPage() {
  return (
    <div className="relative min-h-screen bg-[#04030a] px-4 py-16">
      {/* Ambient atmosphere */}
      <div
        aria-hidden
        className="pointer-events-none absolute -left-40 top-20 h-[520px] w-[520px] rounded-full bg-violet-500/[0.08] blur-[120px]"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute right-[-10%] top-[45%] h-[360px] w-[360px] rounded-full bg-amber-500/[0.05] blur-[100px]"
      />

      <div className="relative mx-auto max-w-3xl">
        {/* Back link */}
        <Link
          href="/"
          className="group mb-12 inline-flex items-center gap-2 font-cinzel text-[10px] font-semibold uppercase tracking-[0.32em] text-slate-500 transition-colors hover:text-amber-300"
        >
          <svg className="h-3 w-3 transition-transform group-hover:-translate-x-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Начало
        </Link>

        {/* Hero */}
        <header className="mb-16">
          <p className="mb-3 font-cinzel text-[10px] font-semibold uppercase tracking-[0.42em] text-slate-500">
            GDPR
          </p>
          <h1 className="font-display text-[2.125rem] leading-[1.1] tracking-tight sm:text-[2.75rem]">
            <span className="font-light text-slate-400">Политика за </span>
            <span className="bg-gradient-to-br from-white via-slate-100 to-amber-200/90 bg-clip-text font-semibold text-transparent drop-shadow-[0_0_28px_rgba(251,191,36,0.18)]">
              поверителност.
            </span>
          </h1>
          <p className="mt-5 max-w-xl font-display text-[16px] font-light leading-[1.85] text-slate-400">
            Данните ти са твои. Ние просто се грижим за тях с нужното внимание.
          </p>
          <div className="mt-6 flex items-center gap-3" aria-hidden>
            <span className="h-1 w-1 rotate-45 bg-amber-300/80 shadow-[0_0_8px_rgba(251,191,36,0.6)]" />
            <span className="h-px w-48 bg-gradient-to-r from-amber-300/50 via-slate-300/20 to-transparent" />
          </div>
        </header>

        <div className="space-y-14">
          {/* I · Data */}
          <section>
            <SectionHeader numeral="I" eyebrow="Данни" title="Какви данни събираме" />
            <ul className="max-w-2xl space-y-3 border-y border-white/[0.05] py-5">
              {[
                'Дата, час и място на раждане (за генериране на астрологична карта)',
                'Изчисления на натална карта и аспекти',
                'AI-генерирани четения и тълкувания',
                'История на дневни хороскопи',
                'Абонаменти за push известия (endpoint, ключове)',
                'Информация за плащане (управлявана изцяло от Stripe - ние не съхраняваме номера на карти)',
              ].map((item) => (
                <li key={item} className="flex items-start gap-3">
                  <span aria-hidden className="mt-[9px] h-1 w-1 shrink-0 rotate-45 bg-amber-300/80 shadow-[0_0_6px_rgba(251,191,36,0.55)]" />
                  <span className="font-display text-[14.5px] leading-[1.8] text-slate-300/90">{item}</span>
                </li>
              ))}
            </ul>
          </section>

          {/* II · Use */}
          <section>
            <SectionHeader numeral="II" eyebrow="Употреба" title="Как използваме данните" />
            <ul className="max-w-2xl space-y-3 border-y border-white/[0.05] py-5">
              {[
                'За генериране на персонализирано астрологично съдържание',
                'За обработка на плащания чрез Stripe',
                'За изпращане на push известия за дневен хороскоп',
              ].map((item) => (
                <li key={item} className="flex items-start gap-3">
                  <span aria-hidden className="mt-[9px] h-1 w-1 shrink-0 rotate-45 bg-amber-300/80 shadow-[0_0_6px_rgba(251,191,36,0.55)]" />
                  <span className="font-display text-[14.5px] leading-[1.8] text-slate-300/90">{item}</span>
                </li>
              ))}
            </ul>
          </section>

          {/* III · Storage */}
          <section>
            <SectionHeader numeral="III" eyebrow="Сигурност" title="Съхранение и защита" />
            <p className="max-w-2xl font-display text-[15px] leading-[1.85] text-slate-300/90">
              Данните ти се съхраняват в <span className="text-slate-100">Supabase (PostgreSQL)</span> с криптиране в покой. Достъпът е защитен чрез Row Level Security (RLS) политики и HTTPS криптиране при пренос. Автентикацията се управлява от <span className="text-slate-100">Clerk</span> с индустриални стандарти за сигурност.
            </p>
          </section>

          {/* IV · Rights */}
          <section>
            <SectionHeader numeral="IV" eyebrow="Права" title="Твоите права" />
            <dl className="max-w-2xl divide-y divide-white/[0.05] border-y border-white/[0.05]">
              {[
                {
                  title: 'Експорт на данни',
                  desc: (
                    <>
                      Можеш да изтеглиш всичките си данни по всяко време; пиши на{' '}
                      <a
                        href="mailto:support@stellaeum.app"
                        className="text-amber-300 underline decoration-amber-300/40 underline-offset-4 transition-colors hover:text-amber-200 hover:decoration-amber-300/80"
                      >
                        support@stellaeum.app
                      </a>
                      , докато подготвяме автоматичното изтегляне.
                    </>
                  ),
                },
                { title: 'Изтриване на акаунт', desc: 'Можеш да заявиш изтриване с 30-дневен гратисен период, през който заявката може да бъде отменена.' },
                { title: 'Възстановяване',      desc: 'През гратисния период от 30 дни можеш да възстановиш акаунта си по всяко време.' },
              ].map((item) => (
                <div key={item.title} className="py-4">
                  <dt className="font-display text-[15px] font-semibold text-slate-100">
                    {item.title}
                  </dt>
                  <dd className="mt-1 font-display text-[14px] leading-[1.75] text-slate-400/90">
                    {item.desc}
                  </dd>
                </div>
              ))}
            </dl>
          </section>

          {/* V · Cookies */}
          <section>
            <SectionHeader numeral="V" eyebrow="Бисквитки" title="Cookies" />
            <p className="max-w-2xl font-display text-[15px] leading-[1.85] text-slate-300/90">
              Използваме сесийни бисквитки чрез Clerk за автентикация. Не използваме бисквитки за проследяване или рекламни цели.
            </p>
          </section>

          {/* VI · Contact */}
          <section>
            <SectionHeader numeral="VI" eyebrow="Контакт" title="Свържи се с нас" />
            <p className="max-w-2xl font-display text-[15px] leading-[1.85] text-slate-300/90">
              За въпроси относно поверителността на данните, пиши ни на{' '}
              <a
                href="mailto:support@stellaeum.app"
                className="text-amber-300 underline decoration-amber-300/40 underline-offset-4 transition-colors hover:text-amber-200 hover:decoration-amber-300/80"
              >
                support@stellaeum.app
              </a>
              .
            </p>
          </section>

          {/* VII · Changes */}
          <section>
            <SectionHeader numeral="VII" eyebrow="История" title="Промени в политиката" />
            <p className="max-w-2xl font-display text-[15px] leading-[1.85] text-slate-300/90">
              Запазваме си правото да актуализираме тази политика. При съществени промени ще бъдеш уведомен/а чрез приложението.
            </p>
            <p className="mt-3 font-cinzel text-[9px] font-semibold uppercase tracking-[0.32em] text-slate-600">
              Последна актуализация · 18 февруари 2026
            </p>
          </section>
        </div>

        {/* Footer diamond */}
        <div className="mt-20 flex justify-center" aria-hidden>
          <div className="flex items-center gap-3">
            <span className="h-px w-16 bg-gradient-to-r from-transparent to-amber-300/40" />
            <span className="h-1 w-1 rotate-45 bg-amber-300/80 shadow-[0_0_8px_rgba(251,191,36,0.6)]" />
            <span className="h-px w-16 bg-gradient-to-l from-transparent to-amber-300/40" />
          </div>
        </div>
      </div>
    </div>
  )
}
