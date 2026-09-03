/**
 * Bulgarian copy for every free-tier locked state (mobile). Mirrors
 * apps/web/lib/tier/locked-copy.ts — kept per-platform because web and
 * mobile do not share a strings package.
 *
 * Content-home (packages/config/eslint/no-new-bg-strings.cjs →
 * CONTENT_HOME_GLOBS: `**​/lib/tier/*.ts`) — tracked by check:copy-lock,
 * does not move the check:bg-lint-baseline ratchet.
 */

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
