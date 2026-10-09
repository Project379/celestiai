# Днес round 4: every new or changed Bulgarian string (for approval)

Nothing here is committed as approved. User-visible UI strings did not change this round (the AI disclosure line, level labels, heading and page titles keep their approved wording; only colours, insets and the disclosure's width changed).

## A. User-visible, needs your approval

| # | Where | String | Status |
|---|---|---|---|
| 1-12 | `apps/web/lib/sign-month/evergreen.ts` (month page, fallback) | The 12 evergreen texts, see the table at the end of `sign-month-compare-2026-11.md` | DRAFT. Copy-lock updated only so the gate passes; approval is yours |
| 13 | Днес, the three lines of the founder's own row today | «Слънцето събужда твоя Марс и ти дава плам за действие.» / «Всяка среща днес изисква пълна яснота и точни думи.» / «Започни най-важния разговор още преди да падне здрач.» | Generated, written to your row only |

The monthly texts themselves are generated; you see all 12 in the review email before they go live (side-by-side samples of two models are in `sign-month-compare-2026-11.md`).

## B. Model-facing Bulgarian (not shown to users; listed because it shapes what users read)

| Where | What changed |
|---|---|
| `apps/web/lib/ai/bulgarian-quality.ts` (new) | Shared writing rules injected into the monthly prompt, the editor pass and the daily v2 prompt: no calques, no stock astrology words, no officialese, no empty intensifiers, article and clitic rules, «във/със». Contains example banned phrases such as «носи енергия», «с много вяра», «с лекота» |
| `apps/web/lib/sign-month/prompt.ts` | New voice (mystical, sky first; sentence 1 an image, sentence 2 an invitation), three tone examples, editor-pass prompt |
| `apps/web/lib/sign-month/generate.ts` | Sky-area phrases reworded with no money, work, partners or relatives: «в онова, което цениш», «в думите и разговорите», «у дома и в корените ти», «в ежедневния ти ритъм», «в близостта с другите», «в дълбоките промени», «в далечните хоризонти», «във високото, към което вървиш». Banned-word lists extended |
| `apps/web/lib/horoscope/prompts.ts` (v2 only) | Quality rules added; paragraph 3 may no longer end on a vague tail such as «с много вяра» |
