// Shared ESLint rule fragment — Stage 5 prevention mechanism
// (register-conversion workstream, 2026-07-30): flags Cyrillic string/
// template literals appearing outside the established content homes, so
// new hardcoded Bulgarian copy in a component/route/hook gets caught at
// lint time instead of discovered in a later audit sweep.
//
// Uses `no-restricted-syntax` with an ESQuery selector rather than a
// custom rule — no new eslint-plugin, works with each app's existing
// flat config (web/Next, mobile/Expo, core/plain-ts) as a plain rules
// object to spread in.
//
// Scope note: this does NOT judge whether existing copy in a content-home
// file is good Bulgarian — that's the rest of this i18n workstream's job.
// It only stops the *next* hardcoded literal from landing somewhere new.
//
// CONTENT_HOME_FILES is deliberately a real, current list (not a rename of
// "everything with Bulgarian in it") — every long-form or structural
// Bulgarian-content file identified across BG_COMPOSED_STRINGS.md,
// BG_UNKNOWN_WORDS.md, and this session's register-conversion sweep.
// `packages/i18n/strings/**` is included pre-emptively: that namespaced
// short-string module architecture is approved but not yet built (see
// .planning i18n handoff docs) — once it exists, new UI copy belongs
// there, not sprinkled through component files, and this rule already
// allows it.

const CYRILLIC_SELECTOR =
  'Literal[value=/[\\u0400-\\u04FF]/], TemplateElement[value.raw=/[\\u0400-\\u04FF]/]'

const NO_NEW_BG_STRINGS_RULE = {
  'no-restricted-syntax': [
    'warn',
    {
      selector: CYRILLIC_SELECTOR,
      message:
        'New Cyrillic string literal outside an established content-home file. Either add real, reviewed Bulgarian copy to one of the existing content modules (packages/core/src/stories/catalog.ts, .../charts/interpretations.ts, apps/web/lib/crystals/guide-content-bg.ts, etc.) or the namespaced strings module (packages/i18n/strings/**), or confirm this file IS a content home and add it to CONTENT_HOME_GLOBS in packages/config/eslint/no-new-bg-strings.cjs.',
    },
  ],
}

// Glob patterns (relative to each app/package root) exempt from the rule.
// Kept as globs, not a hardcoded file list, so both apps/web and
// apps/mobile mirrors of the same file (e.g. AstrologyReference.tsx) are
// covered by one pattern.
const CONTENT_HOME_GLOBS = [
  '**/stories/catalog.ts',
  '**/charts/interpretations.ts',
  '**/charts/sections.ts',
  '**/crystals/guide-content-bg.ts',
  '**/crystals/recommend.ts',
  '**/lib/moon-phase.ts',
  '**/welcome/compose.ts',
  '**/welcome/meteor-showers.ts',
  '**/welcome/sign-quips.ts',
  '**/diary/prompts.ts',
  '**/CelestialCanvas.tsx',
  '**/astrology/src/constants.ts',
  '**/i18n/bg-grammar.ts',
  '**/i18n/format-days-hours.ts',
  '**/horoscope/transit-analysis.ts',
  '**/horoscope/prompts.ts',
  '**/horoscope/transit-to-prompt.ts',
  '**/oracle/prompts.ts',
  '**/oracle/chart-to-prompt.ts',
  '**/components/chart/AstrologyReference.tsx',
  // Future namespaced strings modules (architecture approved, not yet built).
  '**/i18n/strings/**',
]

module.exports = { NO_NEW_BG_STRINGS_RULE, CONTENT_HOME_GLOBS }
