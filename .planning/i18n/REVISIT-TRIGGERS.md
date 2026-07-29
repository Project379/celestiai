# i18n REVISIT Triggers

Open follow-ups from the Bulgarian-language workstream that are noted but
deliberately not built yet. Revisit when the named trigger condition is met.

---

## Mapped friendly error messages (not raw Error.message in JSX)

**Logged:** 2026-07-29, during Неоторизиран phrasing work (Stage 1B/2).

**Current state:** API routes return `{ error: 'Неоторизиран достъп' }` (and
similar raw strings) directly in the JSON body. Client hooks
(`useChart.ts`, `useTransitOverview.ts`, etc.) do
`throw new Error(data.error ?? fallback)`, and components render
`error.message` straight into JSX (e.g. `<ChartError message={error} />`).
This couples the user-facing copy to whatever string the API happens to
throw — every route that wants good Bulgarian copy has to get it right
independently, and there's no single place to fix tone/register later.

**Why not fixed now:** Scope creep beyond the current ask (replace the
Неоторизиран string). Restructuring how errors flow from API to UI is a
separate, larger change — a mapped table of
`errorCode -> friendly Bulgarian message` that hooks/components look up
instead of rendering the raw string, likely living alongside
`packages/core/src/i18n/bg-grammar.ts` or a sibling module.

**Revisit trigger:** Next time a raw API error string needs a copy change
(tone, wording, or a new error case), or when Stage 5 (approved-copy lock +
lint rule against new Cyrillic literals outside the strings modules) is
planned — that stage's lint rule would otherwise have to special-case every
`throw new Error(data.error)` call site.
