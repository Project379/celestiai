---
title: Next.js version-block upgrade — investigation
status: HALTED before upgrading per founder instruction — this is a minor-version jump (15.2 → 15.5), not a patch bump. Recommendation below; not executed.
created: 2026-08-27
---

# Next.js version block — Vercel refuses to deploy 15.2.4

The `turbo.json` fix (`83317a6`) worked: Turborepo compiled successfully
("Tasks: 1 successful"), the module-scope Stripe error is gone. Vercel
then **refused to deploy the output**: `Build Failed — Vulnerable version
of Next.js detected, please update immediately.` (Production, main @
`944ead0`). Separate stage, separate gate.

---

## 1. Which CVE, severity, does it affect *our* usage

**It is a blanket version block on the deploy platform, not a
usage-specific one.** Vercel refuses to deploy any Next.js version with a
known unpatched critical, regardless of whether your app's config exposes
it. Our 15.2.4 is unpatched for at least three batches:

| Release | Advisories | Relevant to us? |
|---|---|---|
| **August 2026** (`nextjs.org/blog/august-2026-security-release`) | **GHSA-2xp9-vwfh-vxw4** — Critical, unauthenticated RCE in the Image Optimization API via attacker-controlled AVIF (libheif/`sharp`). **CVE-2026-75604** — Critical, unauthenticated RCE on **Windows-hosted** servers using Pages + App Router without Cache Components. | **AVIF RCE: NO — `next/image` is not used anywhere** in `apps/web` (VERIFIED: grep for `next/image` / `<Image` returns only the auto-generated `next-env.d.ts` reference; the `images.formats` block in `next.config.js` is dead config). **Windows RCE: NO — App Router only** (no `pages/` dir, VERIFIED) **and Linux on Vercel.** |
| **May 2026** (`vercel.com/changelog/next-js-may-2026-security-release`) | 13 advisories, incl. an upstream React CVE (CVE-2026-23870). Fixed on 15.x at **15.5.18**. | Mixed — most are RSC/cache/SSRF classes. No `next/image`, no `'use server'` server actions (VERIFIED — grep empty), App Router only. Low specific exposure, but several are "any RSC app" class. |
| Earlier 2025 | CVE-2025-29927 (middleware auth bypass — **already patched in 15.2.3**, we're past it), various SSRF / cache-poisoning / DoS. | CVE-2025-29927 not applicable (patched). Others are version-blocked regardless. |

**Bottom line for Q1:** our *specific* exposure to the two August 2026
criticals is **nil** (no `next/image`, App-Router-only, Linux). But
**Vercel's gate blocks the version, not the vulnerability** — it will not
deploy 15.2.4 no matter our config, and there is a genuine tail of
lower-severity RSC-class advisories that do apply to any App Router app.

## 2. Minimum version that clears the gate

**`next@15.5.24`.**

**There is no patch on the 15.2.x, 15.3.x, or 15.4.x lines.** Next.js
maintains exactly two lines: **16.x (Active LTS)** and **15.5.x
(Maintenance LTS)**. Security fixes land only on those. The May 2026
release said "15.x → 15.5.18"; the August 2026 release moved that to
**15.5.24**. So the smallest upgrade that actually unblocks Vercel while
staying on 15 is **15.2.4 → 15.5.24**. (16.3.3 is the alternative, but
that's a major jump with real App Router / caching changes — not the
smallest.)

## 3. What 15.2.4 → 15.5.24 actually touches — small surface for this codebase

It's a **3-minor jump on paper** (15.3, 15.4, 15.5), but the real
breaking-change surface here is narrow, because the big Next 15 breaking
changes (async `params`/`searchParams`/`cookies()`/`headers()`,
uncached-by-default fetch/GET handlers) **all landed in 15.0** — we
already absorbed them at 15.2.4.

Checked against what we use:

| Area | Status |
|---|---|
| **App Router** | Stable across 15.2→15.5. No `pages/` dir. Official upgrade note: "No code changes required if you're already using App Router." |
| **Middleware** (`middleware.ts`, 64 lines: `clerkMiddleware` + `createRouteMatcher` + `auth.protect()` + security headers) | API unchanged 15.2→15.5. **`@clerk/nextjs@6.36.9`'s peer range is `^13.5.7 \|\| ^14.2.25 \|\| ^15.2.3 \|\| ^16` — 15.5.24 is covered.** No Clerk upgrade needed. (The "151 kB of middleware" is the compiled bundle incl. Clerk, not our code.) |
| **Server Actions** | **Not used** (VERIFIED — `'use server'` grep empty). Irrelevant. |
| `import { after } from 'next/server'` (4 routes) | `after` went stable in **15.1**; we already use the stable form. Unchanged in 15.5. |
| **`serverExternalPackages` + `webpack.config.externals`** for `sweph` / `dictionary-bg` / `geo-tz` | `next.config.js`'s own comment already records testing this exact externalization against **"Next 15.5.9"** and finding `serverExternalPackages` alone insufficient — hence the explicit `config.externals` belt-and-suspenders. **This config was already made 15.5-proof.** Re-verify with a local `next build` after the bump, but the known-hard part is already handled. |
| **`transpilePackages`** (nativewind, react-native-css-interop, @stellaeum/*) | nativewind v4 supports 15.5. Watch the local build; not a known breakage. |
| **`lint: "next lint"`** | **Deprecated in 15.5** (warning only, still works). Removed in 16. `check:all` → `turbo run lint` → `next lint` will print a deprecation warning but not fail. A migration to the ESLint CLI is a **pre-16 task**, not a blocker now. |
| **`@sentry/nextjs@10.50.0`** + `withSentryConfig` | Sentry 10.x supports Next 15.5. Recent enough. Re-verify the plugin runs clean in the local build (it's a known friction point with Turbopack, but we build with Webpack). |

**The one real alignment risk — React.** `next@15.5.24`'s react peer is
**identical** to `15.2.4`'s (`^18.2.0 || 19.0.0-rc… || ^19.0.0`), so the
Next bump **does not force a React change.** BUT: `@clerk/nextjs@6.36.9`'s
react peer is `^18.0.0 || ~19.0.3 || ~19.1.4 || ~19.2.3 || ~19.3.0-0`,
and we're on **react 19.1.0** — which falls in the gap between `~19.0.3`
and `~19.1.4`, i.e. **already marginally outside Clerk's range today**
(pre-existing, not caused by this upgrade). If `pnpm install` re-resolves
during the bump and nudges React, mobile's `react-native@0.81.5` (which
pins React `19.1.0`) is the alignment trap the founder has been bitten by
twice. **Mitigation:** bump `next` only, keep `react`/`react-dom` pinned
exactly where they are, then `pnpm why react` to confirm no movement
before `check:all`. If React moves, pin it back explicitly.

## 4. Mobile impact

**Structurally minimal.** `next` is only in `apps/web`; its react peer
range is unchanged by the bump; nothing in `apps/mobile` imports it. The
only vector is pnpm's single-lockfile re-resolution touching the shared
`react` / `react-dom` version — addressed by the pin-and-verify step
above. `react-native@0.81.5` ships React 19.1.0 and is unaffected by a
web-only Next bump.

## 5. Recommendation

**Upgrade `next` `15.2.4` → `15.5.24` (pinned exact, no caret).** Leave
`react`, `react-dom`, `@clerk/nextjs`, `@sentry/nextjs`,
`eslint-config-next` untouched. Steps:

1. `pnpm --filter @stellaeum/web add next@15.5.24` (exact).
2. `pnpm why react` and `pnpm why react-dom` — confirm still `19.1.0`, no
   duplication. Pin back if moved.
3. `pnpm --filter @stellaeum/web exec next build` locally — confirm the
   `sweph` / `dictionary-bg` / `geo-tz` externalization still holds and
   the Sentry plugin runs clean.
4. `pnpm run check:all` (strictness, bg-strings, copy-lock, lint-baseline,
   error-codes, typecheck, lint, 191 tests). Expect a `next lint`
   deprecation **warning** — not a failure.
5. Founder redeploys.

**Deferred, not now:** migrating `next lint` → ESLint CLI (a pre-Next-16
task); deciding whether to go to 16.x at all (bigger, and 15.5.x
Maintenance LTS buys time).

## 6. Why this is halted

Per founder instruction: *"If the upgrade turns out to be larger than a
patch bump, halt and tell me before doing it — I would rather understand
a minor-version jump than discover it in a failed build."* This is a
15.2 → 15.5 minor jump (there is no patch-level fix on 15.2.x). The
surface is small and well-understood per §3, but the instruction is
explicit. **Awaiting the go-ahead to run §5.**
