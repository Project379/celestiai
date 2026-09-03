/**
 * Bulgarian copy for every free-tier locked state (web).
 *
 * Registered as a content-home (packages/config/eslint/no-new-bg-strings.cjs
 * → CONTENT_HOME_GLOBS: `**​/lib/tier/*.ts`), so these strings are tracked by
 * check:copy-lock without moving the check:bg-lint-baseline ratchet.
 *
 * The Oracle `CapReachedNotice` strings were previously inline in that
 * component (counted toward the 1800 baseline); moving them here is why the
 * baseline drops. Wording is unchanged — it went through two founder review
 * passes (see scripts/i18n/check-bg-lint-baseline.mjs, 1778→1800 entry):
 * "тълкуване" not "четене", topics-first, "Отключи Премиум" CTA.
 */

export const PREMIUM_CTA = 'Отключи Премиум'

/** Oracle conversion surface — one entry per `CapReachedReason`. */
export const ORACLE_CAP_COPY = {
  premium_topic: {
    title: 'Любов, кариера и здраве са теми за Премиум.',
    sub: 'Личностното тълкуване остава безплатно.',
  },
  premium_regenerate: {
    title: 'Ново тълкуване има само в Премиум.',
    sub: 'С Премиум го получаваш отново, когато пожелаеш.',
  },
  free_used: {
    title: 'Това беше безплатното ти тълкуване от Оракула.',
    sub: 'С Премиум получаваш неограничени тълкувания по всички теми.',
  },
} as const

/** Legacy monthly-cap wording, used when the server sends no `reason`. */
export const oracleCapLegacy = (cap: number) => ({
  title: `Достигна лимита от ${cap} безплатни тълкувания.`,
  sub: 'Премиум го премахва.',
})

/** Recommendations (item 4) — monthly arc detail locked for free. */
export const RECS_MONTHLY_LOCKED = {
  title: 'Месечната дъга е за Премиум.',
  sub: 'Дневната препоръка остава безплатна.',
}
export const RECS_DETAIL_LOCKED = 'Пълното обяснение е в Премиум.'

/** Crystals collection — grid visible, collection locked for free. */
export const CRYSTALS_LOCKED = {
  title: 'Личната ти колекция е за Премиум.',
  sub: 'Разгледай камъните — събирането и препоръките по натална карта се отключват с Премиум.',
}
export const CRYSTALS_COLLECT_LOCKED = 'Събирането е за Премиум.'

/** Кръг — locked affordances (the saved-profile compatibility teaser stays). */
export const KRUG_SECOND_PROFILE_LOCKED = {
  title: 'Само един запазен профил в безплатния план.',
  sub: 'С Премиум добавяш още.',
}
export const KRUG_INVITE_LOCKED = 'Поканите са за Премиум'
export const KRUG_REPORT_LOCKED = 'Докладът е за Премиум'
