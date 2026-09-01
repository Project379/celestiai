import Link from 'next/link'
import type { Metadata } from 'next'
import { TERMS_PAGE_TITLE_BG, TERMS_PAGE_DESCRIPTION_BG } from '@/lib/legal/compliance-copy'

// STELLAEUM_PLACEHOLDER: TERMS — /terms exists only so the checkout and
// pricing-page links are not dead. The body below is a placeholder, NOT a
// lawyer-reviewed Terms of Service. See .planning/PLACEHOLDERS.md TERMS.

export const metadata: Metadata = {
  title: TERMS_PAGE_TITLE_BG,
  description: TERMS_PAGE_DESCRIPTION_BG,
}

export default function TermsPage() {
  return (
    <div className="relative min-h-screen bg-[#04030a] px-4 py-16">
      <div className="relative mx-auto max-w-3xl">
        <Link
          href="/"
          className="group mb-12 inline-flex items-center gap-2 font-cinzel text-[10px] font-semibold uppercase tracking-[0.32em] text-slate-500 transition-colors hover:text-amber-300"
        >
          <svg className="h-3 w-3 transition-transform group-hover:-translate-x-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Начало
        </Link>

        <header className="mb-10">
          <p className="mb-3 font-cinzel text-[10px] font-semibold uppercase tracking-[0.42em] text-slate-500">
            Условия за ползване
          </p>
          <h1 className="font-display text-[2.125rem] leading-[1.1] tracking-tight sm:text-[2.75rem]">
            <span className="bg-gradient-to-br from-white via-slate-100 to-amber-200/90 bg-clip-text font-semibold text-transparent">
              Условия за ползване
            </span>
          </h1>
        </header>

        <div className="space-y-5 font-display text-[15px] leading-[1.85] text-slate-300/90">
          <p className="border-l border-amber-300/40 bg-amber-300/[0.04] px-4 py-3 text-[14px] text-slate-300/90">
            Този текст е предварителен и все още не е преминал през юридически
            преглед. Окончателните условия ще бъдат публикувани преди старта
            на приложението.
          </p>
          <p>
            Stellaeum е астрологично приложение с абонамент. Услугата се
            предоставя такава, каквато е, за лично ползване.
          </p>
          <p>
            Абонаментът се подновява автоматично, докато не бъде прекратен.
            Прекратяване е възможно по всяко време от настройките на
            абонамента или през клиентския портал на Stripe.
          </p>
          <p>
            Астрологичните тълкувания са с познавателна и развлекателна цел и
            не заместват професионална консултация. Съдържанието е генерирано
            от изкуствен интелект.
          </p>
          <p>
            Приложимо право: българското законодателство. Въпроси и жалби:{' '}
            <a
              href="mailto:support@stellaeum.com"
              className="text-amber-300 underline decoration-amber-300/40 underline-offset-4 hover:text-amber-200"
            >
              support@stellaeum.com
            </a>
            .
          </p>
          <p>
            Виж също{' '}
            <Link href="/privacy" className="text-amber-300 underline decoration-amber-300/40 underline-offset-4 hover:text-amber-200">
              Политика за поверителност
            </Link>
            .
          </p>
        </div>
      </div>
    </div>
  )
}
