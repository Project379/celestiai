import Link from 'next/link'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Поддръжка',
  description: 'Помощ за Stellaeum — как да се свържеш с нас и отговори на честите въпроси',
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

const FAQ: { q: string; a: string }[] = [
  {
    q: 'Не мога да вляза',
    a: 'Провери дали имейл адресът и паролата са изписани правилно. Ако си забравил/а паролата, използвай „Забравена парола“ на екрана за вход. Ако пак нямаш достъп, пиши ни от имейл адреса, с който си се регистрирал/а, и ще помогнем.',
  },
  {
    q: 'Възстановяване на покупки',
    a: 'Абонаментът се управлява през App Store, Google Play или уеб приложението — според това откъде си се абонирал/а. Ако си сменил/а устройството и Премиум достъпът не се показва, влез със същия профил, с който е направен абонаментът. Ако пак не се появи, пиши ни.',
  },
  {
    q: 'Изтриване на акаунт',
    a: 'Отвори „Ти“ → „Настройки“ → „Изтриване на акаунт“. Има 30-дневен гратисен период, през който можеш да се откажеш. След това всички данни се изтриват без възможност за връщане.',
  },
  {
    q: 'Не получавам известия',
    a: 'Провери дали известията за Stellaeum са разрешени в настройките на устройството. Дневният хороскоп пристига веднъж дневно. Ако известията са разрешени, но не идват, пиши ни и посочи модела на телефона.',
  },
]

export default function SupportPage() {
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
            Поддръжка
          </p>
          <h1 className="font-display text-[2.125rem] leading-[1.1] tracking-tight sm:text-[2.75rem]">
            <span className="font-light text-slate-400">Тук сме, ако </span>
            <span className="bg-gradient-to-br from-white via-slate-100 to-amber-200/90 bg-clip-text font-semibold text-transparent drop-shadow-[0_0_28px_rgba(251,191,36,0.18)]">
              нещо заяде.
            </span>
          </h1>
          <p className="mt-5 max-w-xl font-display text-[16px] font-light leading-[1.85] text-slate-400">
            Stellaeum е астрологично приложение — натална карта по швейцарски ефемериди и четения на български. Ако нещо не работи както трябва, пиши ни.
          </p>
          <div className="mt-6 flex items-center gap-3" aria-hidden>
            <span className="h-1 w-1 rotate-45 bg-amber-300/80 shadow-[0_0_8px_rgba(251,191,36,0.6)]" />
            <span className="h-px w-48 bg-gradient-to-r from-amber-300/50 via-slate-300/20 to-transparent" />
          </div>
        </header>

        <div className="space-y-14">
          {/* I · Contact */}
          <section>
            <SectionHeader numeral="I" eyebrow="Контакт" title="Свържи се с нас" />
            <p className="max-w-2xl font-display text-[15px] leading-[1.85] text-slate-300/90">
              Пиши на{' '}
              <a
                href="mailto:support@stellaeum.com"
                className="text-amber-300 underline decoration-amber-300/40 underline-offset-4 transition-colors hover:text-amber-200 hover:decoration-amber-300/80"
              >
                support@stellaeum.com
              </a>
              {' '}и ще ти отговорим възможно най-скоро. Ако проблемът е при вход
              или плащане, пиши от имейла, с който си се регистрирал/а — така
              намираме акаунта по-бързо.
            </p>
          </section>

          {/* II · FAQ */}
          <section>
            <SectionHeader numeral="II" eyebrow="Чести въпроси" title="Бързи решения" />
            <dl className="max-w-2xl divide-y divide-white/[0.05] border-y border-white/[0.05]">
              {FAQ.map((item) => (
                <div key={item.q} className="py-4">
                  <dt className="font-display text-[15px] font-semibold text-slate-100">{item.q}</dt>
                  <dd className="mt-1 font-display text-[14px] leading-[1.75] text-slate-400/90">{item.a}</dd>
                </div>
              ))}
            </dl>
          </section>

          {/* III · Legal */}
          <section>
            <SectionHeader numeral="III" eyebrow="Документи" title="Поверителност и условия" />
            <p className="max-w-2xl font-display text-[15px] leading-[1.85] text-slate-300/90">
              Как обработваме личните ти данни е описано в{' '}
              <Link
                href="/privacy"
                className="text-amber-300 underline decoration-amber-300/40 underline-offset-4 transition-colors hover:text-amber-200 hover:decoration-amber-300/80"
              >
                Политиката за поверителност
              </Link>
              .
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
