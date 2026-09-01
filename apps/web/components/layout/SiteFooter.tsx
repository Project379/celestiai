import Link from 'next/link'
import { LEGAL_ENTITY } from '@/lib/legal/compliance-copy'

/**
 * Site-wide footer. Rendered once in the root layout so every page —
 * marketing, auth, and the authenticated app — carries the EU consumer-law
 * trader identification and the link to the supervisory authority (КЗП).
 *
 * The entity values are placeholders — see LEGAL_ENTITY in
 * @/lib/legal/compliance-copy (STELLAEUM_PLACEHOLDER: ENTITY-NAME).
 */
export function SiteFooter() {
  return (
    <footer className="border-t border-white/[0.05] bg-[#04030a]/60">
      <div className="container mx-auto flex flex-col gap-4 px-4 py-8 text-[11px] leading-relaxed text-slate-500">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
          <span className="font-cinzel text-[9.5px] font-semibold uppercase tracking-[0.34em] text-slate-600">
            &copy; 2026 Stellaeum AI
          </span>
          <Link href="/terms" className="transition-colors hover:text-amber-300">
            Условия за ползване
          </Link>
          <Link href="/privacy" className="transition-colors hover:text-amber-300">
            Политика за поверителност
          </Link>
          <Link href="/support" className="transition-colors hover:text-amber-300">
            Поддръжка
          </Link>
        </div>

        <address className="not-italic">
          <span className="block">Оператор: {LEGAL_ENTITY.name}</span>
          <span className="block">ЕИК: {LEGAL_ENTITY.eik}</span>
          <span className="block">Адрес: {LEGAL_ENTITY.address}</span>
          <span className="block">ДДС №: {LEGAL_ENTITY.vat}</span>
          <span className="block">
            Имейл:{' '}
            <a
              href={`mailto:${LEGAL_ENTITY.contactEmail}`}
              className="transition-colors hover:text-amber-300"
            >
              {LEGAL_ENTITY.contactEmail}
            </a>
          </span>
        </address>

        <p>
          Надзорен орган:{' '}
          <a
            href={LEGAL_ENTITY.supervisoryAuthorityUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="transition-colors hover:text-amber-300"
          >
            {LEGAL_ENTITY.supervisoryAuthority}
          </a>
        </p>
      </div>
    </footer>
  )
}
