# API Route Handler Auth Audit

**Commit under audit:** `debdc6b` on `mobile-parallel-test` (section 3 of post-UAT fixes)
**Scope:** every `route.ts` under `apps/web/app/api/`
**Rules (from §4):**
- User-scoped reads/writes → `auth()` + explicit Bulgarian 401. `auth.protect()` is wrong here; its throw-based flow surfaces as opaque 500s in route handlers.
- Public reads → no auth.
- Webhooks → no Clerk auth; signature verification instead.
- Cron → Bearer-secret verification.

---

## Table

| # | Endpoint | Methods | Current auth behavior | Correct behavior | Fix needed |
|---:|---|---|---|---|---|
| 1 | `/api/birth-data` | GET, POST | `auth()` + BG 401 | user-scoped → `auth()` + BG 401 | **no** |
| 2 | `/api/birth-data/[id]` | GET, PATCH, DELETE | `auth()` + BG 401 on each | user-scoped → `auth()` + BG 401 | **no** |
| 3 | `/api/chart/calculate` | POST | `auth()` + BG 401 | user-scoped → `auth()` + BG 401 | **no** |
| 4 | `/api/cities/search` | GET | `auth()` + BG 401 (commented SEC-17: gated to prevent scraping of the city catalog) | reference-data read; **policy call**. Strict user-scope rule says public. Scraping-defense argument says gated. Pick one and document. Not a security bug either way. | **policy** |
| 5 | `/api/cron/cleanup-deleted-accounts` | GET | `Authorization: Bearer ${CRON_SECRET}` check + BG 401 | cron → bearer-secret | **no** |
| 6 | `/api/cron/daily-horoscope` | GET | `Authorization: Bearer ${CRON_SECRET}` check + BG 401 | cron → bearer-secret | **no** |
| 7 | `/api/crystals` | GET | `auth()` + EN `"Unauthorized"` 401, then premium gate in core | user-scoped → `auth()` + BG 401 | **yes** — copy inconsistency: error string is English; should be `Неоторизиран достъп` to match the rest of the protected surface |
| 8 | `/api/crystals/collect` | POST | `auth()` + EN `"Unauthorized"` 401 | user-scoped → `auth()` + BG 401 | **yes** — same EN/BG inconsistency |
| 9 | `/api/crystals/daily/collect` | POST | `auth()` + EN `"Unauthorized"` 401 | user-scoped → `auth()` + BG 401 | **yes** — same EN/BG inconsistency |
| 10 | `/api/crystals/daily-streak` | GET | `auth()` + EN `"Unauthorized"` 401 | user-scoped → `auth()` + BG 401 (**and see §5 matrix — gating may change**) | **yes** — copy fix, plus possible matrix re-gating |
| 11 | `/api/crystals/today` | GET | `auth()` returns `userId \| null` and passes it through to core; anonymous callers get the rotation + phase with `isPremium:false`, `streak:null`, `collectedToday:false`. No 401 branch. | **matrix-dependent** — per §5 the daily rotation + phase is a free-tier / anon surface. Current "allow null userId" behavior aligns with that. Keeping anon access is correct. | **no (pending §5 sign-off)** |
| 12 | `/api/gdpr/delete-account` | POST, DELETE | `auth()` + BG 401 on each | user-scoped → `auth()` + BG 401 | **no** |
| 13 | `/api/gdpr/export` | GET | `auth()` + BG 401 | user-scoped → `auth()` + BG 401 | **no** |
| 14 | `/api/horoscope/generate` | POST (streaming) | `auth()` + BG 401, then chart-ownership check 403 | user-scoped → `auth()` + BG 401 | **no** |
| 15 | `/api/oracle/generate` | POST (streaming) | `auth()` + BG 401, upserts users-row, premium path differs | user-scoped → `auth()` + BG 401 | **no** (but §5 oracle-cap gate correctness is separate) |
| 16 | `/api/oracle/readings` | GET | `auth()` + BG 401 | user-scoped → `auth()` + BG 401 | **no** |
| 17 | `/api/oracle/teaser` | POST | `auth()` + BG 401 | user-scoped → `auth()` + BG 401 | **no** |
| 18 | `/api/planets/current` | GET | none (public) | public astronomical data → none | **no** |
| 19 | `/api/push/subscribe` | POST | `auth()` + BG 401 | user-scoped → `auth()` + BG 401 | **no** |
| 20 | `/api/push/unsubscribe` | POST | `auth()` + BG 401 | user-scoped → `auth()` + BG 401 | **no** |
| 21 | `/api/stripe/cancel` | POST, DELETE | `auth()` + BG 401 | user-scoped → `auth()` + BG 401 | **no** |
| 22 | `/api/stripe/checkout` | POST | `auth()` + BG 401 | user-scoped → `auth()` + BG 401 | **no** |
| 23 | `/api/stripe/portal` | POST | `auth()` + BG 401 | user-scoped → `auth()` + BG 401 | **no** |
| 24 | `/api/stripe/status` | GET | `auth()` + BG 401 | user-scoped → `auth()` + BG 401 | **no** |
| 25 | `/api/stripe/subscription` | GET | **`await auth.protect()` then `await auth()` with a fallback 401** — both paths; `auth.protect()` throws on unauth which becomes an opaque 500 in a route handler, per the §4 rule this is wrong | user-scoped → `auth()` + BG 401 only | **yes** — delete the `auth.protect()` call, keep the existing `auth()` + BG 401 branch |
| 26 | `/api/transits/overview` | GET | `auth()` + EN `"Unauthorized"` 401, then premium gate in core | user-scoped → `auth()` + BG 401 (**§5: premium gate is WRONG per matrix — transits are free**) | **yes** — copy fix + premium-gate removal |
| 27 | `/api/user` | GET | **`await auth.protect()` then `await auth()`** — same antipattern as #25 | user-scoped → `auth()` + BG 401 | **yes** — delete `auth.protect()`, add explicit `auth()` + BG 401 branch |
| 28 | `/api/webhooks/stripe` | POST | Stripe signature verification via `stripe.webhooks.constructEvent` + idempotency check on `processed_webhook_events` | webhook → signature | **no** |

---

## Summary

- **28 endpoints total.**
- **19 pass** as currently implemented (no fix).
- **6 need copy-only fixes** — EN `"Unauthorized"` → BG `Неоторизиран достъп` on the 5 crystals endpoints + transits (and same copy on the §25/§27 fixes). These six were all touched during M1+M2+M3 extraction; the EN fallback is an artifact of the original `throw new Response("Unauthorized")` pattern that predated the Bulgarian error-message convention. `/api/crystals/today` is intentionally `auth()→null-passthrough` and stays.
- **2 structural fixes** — `/api/stripe/subscription` and `/api/user` use `auth.protect()` inside a route handler. Per §4 rule, `auth.protect()` throws and produces opaque 500s; replace with `auth()` + BG 401 shape. `/api/user` additionally relies on `auth.protect()` for its entire gate (no `if (!userId) return 401` branch) so it is actively broken per the §4 rule.
- **1 matrix-dependent fix** — `/api/transits/overview` currently returns 403 PREMIUM_REQUIRED for free-tier callers. Per §5 corrected matrix, transits are **free**. The premium gate was wrong pre-M2 and M2 preserved it. Flagged for removal pending §5 sign-off.
- **1 policy call** — `/api/cities/search` currently requires auth (SEC-17 rationale: scraping defense). Strict §4 user-scope rule says public. Not a security bug either way; pick a policy.
- **0 broken webhook / cron auth** — Stripe signature verification and cron Bearer-secret check are both correctly in place.

## Group the fixes into commits

Proposed when §5 is signed off and fixes proceed:

1. **copy fix commit** — 6 endpoints, EN→BG, trivial string edits
2. **auth.protect-in-route-handler fix** — `/api/stripe/subscription` + `/api/user`, structural rewrite
3. **transits premium-gate removal** — gated on §5 sign-off; touches both `/api/transits/overview` and `packages/core/src/horoscope/transits.ts`
4. **cities policy decision** — defer or edit after explicit policy choice

No code until §5 is signed off and the full fix order is decided.
