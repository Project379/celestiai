---
title: Vercel Deploy Diagnostic — repo-side prep
status: ROOT CAUSE CONFIRMED 2026-08-27 from the actual build log. §3 (module-scope Stripe) was right, with a layer on top: Turborepo strict env mode filtered the secrets out of `next build`. turbo.json fix applied (`83317a6`). See the resolution block below.
---

# Vercel deploy diagnostic

---

## RESOLUTION — 2026-08-27 (build log in hand)

The founder pulled the real build log. Error at line 1451:
`Error: Neither apiKey nor config.authenticator provided` →
`Failed to collect page data for /api/stripe/cancel`. Immediately after,
Turborepo's own warning that 16 env vars are **set on the Vercel project
but missing from `turbo.json`**, so they "WILL NOT be available to your
application."

**Chain:** Turborepo 2.x defaults to **strict env mode** — a task only
receives env vars declared in `env`/`globalEnv` (plus framework-inferred
ones). `turbo.json` declared none. So `next build` ran with no
`STRIPE_SECRET_KEY`, and `lib/stripe/client.ts:11`'s **module-scope**
`new Stripe(process.env.STRIPE_SECRET_KEY!)` threw during Next's
page-data collection → whole build fails. §3 below correctly identified
the Stripe construction; what it couldn't see without the log was *why*
the var was absent despite being set in Vercel.

**Fix applied (`83317a6`):** added the 14 non-public vars that
`apps/web` + `packages/{core,astrology}` + `next.config.js` +
`sentry.*.config.ts` actually read to `turbo.json`'s `build.env`. List is
**grep-derived from code**, not copied from the Vercel warning:
`DATABASE_URL` (repo scripts/diagnostics only — never the web runtime or
build, VERIFIED by grep) and `EXPO_PUBLIC_API_BASE` (a mobile var that
should not be in the web env at all) are **deliberately excluded** even
though the warning names them. `NEXT_PUBLIC_*` are **not** listed —
Turborepo's Next.js framework inference passes them through automatically
(confirmed: the Vercel warning listed zero `NEXT_PUBLIC_*` despite many
being set). Validated with
`turbo run build --filter=@stellaeum/web --dry` — the 14 vars resolve on
`@stellaeum/web#build`, `Framework = nextjs`.

**Still open — module-scope Stripe (recommendation, not yet done):**
`lib/stripe/client.ts` constructs Stripe at import time, so a
missing/rotated/renamed key is a **build failure** (whole site, all 40
routes) rather than a **runtime 500** (4 `/api/stripe/*` routes).
`lib/ai/client.ts:16` is also module-scope but `createOpenAI` does **not**
throw on an undefined key (auth deferred to request), so it survives the
build — Stripe is the **only** true build-breaker (VERIFIED by grep for
top-level `new`/`createClient`/`createOpenAI`; everything else is a
factory function or a harmless `Intl.DateTimeFormat`). Recommend a lazy
getter — same pattern as `lib/supabase/service.ts`'s
`createServiceSupabaseClient()`, which throws only when *called*. ~5-line
change, no behaviour change when the key is present, downgrades the
failure mode from catastrophic to local. **Env list is necessary
(nothing deploys without it); lazy init is resilience (so the next env
slip is a contained incident).** Held for founder ruling.

**Supabase CLI `ENOENT` in the same log — verdict: NOISE, not the cause.**
`supabase` is a **root `devDependencies`** entry (`"supabase": "^2.92.1"`)
with a `"supabase": "supabase"` passthrough script. **Nothing in the web
app imports it** (VERIFIED — grep). Under pnpm 9 with no `.npmrc`
`onlyBuiltDependencies`, the CLI's postinstall (which downloads a
platform binary) is blocked by default, so pnpm then can't create the
`.bin` shim for a binary that was never fetched → the `ENOENT`. pnpm
**warns and continues**; the build got well past install and died on
Stripe. Not fatal for the web build. Clean-up options if the log noise
is unwanted: (a) leave it — it's a warning; (b) move `supabase` out of
the dependency graph Vercel installs (it's a local dev tool) — but that
breaks `pnpm supabase …` locally; (c) `.npmrc` `onlyBuiltDependencies`
allowlisting it so the postinstall runs. Recommend (a) for now;
revisit only if a future Vercel setting makes install fail on script
errors.

**Next:** redeploy on `83317a6` and read the log again. If the Stripe
error is gone, §3's turbo.json layer was the whole build-phase blocker.
§2's install-phase risks (workspace visibility, sweph native build) are
still unverified and would surface next if present.

---

18 deployments checked via the GitHub Deployments API span 2026-07-29
through today, every one `state: failure`. This is everything gatherable
from the repo side to read the actual build log against, ordered cheapest/
most-likely first — not a claim about which one is the actual cause.

---

## 1. Env var inventory — build-time vs. runtime

**Build-time (`NEXT_PUBLIC_*`, baked into the client bundle at `next
build`)** — missing these doesn't necessarily fail the build, but ships a
broken client bundle (undefined values baked in):

| Var | Used for |
|---|---|
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Clerk client SDK |
| `NEXT_PUBLIC_CLERK_SIGN_IN_URL` / `_SIGN_UP_URL` / `_SIGN_IN_FALLBACK_REDIRECT_URL` / `_SIGN_UP_FALLBACK_REDIRECT_URL` | Clerk routing |
| `NEXT_PUBLIC_SUPABASE_URL` / `_ANON_KEY` | Supabase client config (server-lazy, see §2) |
| `NEXT_PUBLIC_APP_URL` | Stripe redirect URLs — defaults to `http://localhost:3000` in `.env.example`; **check this is actually set to the real prod URL in Vercel, not left at the example default** |
| `NEXT_PUBLIC_SENTRY_DSN` | Client-side Sentry |
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY` | Web Push |

**Build-time, Sentry-plugin-specific (read by `withSentryConfig` in
`next.config.js`, not app code):**

| Var | Used for |
|---|---|
| `SENTRY_AUTH_TOKEN` | Source-map upload during build. Scopes needed: `project:releases` + `org:read`. A missing/expired token *usually* just skips upload with a warning, not a hard failure — but versions vary; check the log for a Sentry-plugin error specifically, don't rule it out. |
| `SENTRY_ORG` / `SENTRY_PROJECT` | Same plugin |

**Runtime-only (server/edge, never in the client bundle, read inside
functions — missing these fails at request time on the specific route
that needs them, not at build time, EXCEPT one case flagged in §3):**

| Var | Used for |
|---|---|
| `CLERK_SECRET_KEY` | Clerk server SDK |
| `SUPABASE_SERVICE_ROLE_KEY` | `lib/supabase/service.ts` — lazy, guarded (throws a clean error if missing, doesn't crash the build) |
| `GEMINI_API_KEY` | AI generation (Oracle, daily horoscope) |
| `CRON_SECRET` | Cron route auth |
| `VAPID_PRIVATE_KEY` | Web Push send |
| `STRIPE_SECRET_KEY` | **NOT lazy — see §3, this is the strongest lead** |
| `STRIPE_WEBHOOK_SECRET`, `STRIPE_PRICE_MONTHLY`, `STRIPE_PRICE_ANNUAL` | Stripe routes — lazy, read inside handlers |
| `REVENUECAT_WEBHOOK_SECRET` | RevenueCat webhook — fails closed by design if unset (never skips signature verification) |
| `SENTRY_DSN` | Server-side Sentry (distinct from the `NEXT_PUBLIC_` client one — same DSN value, different var name, both required) |

**Listed in `.env.example` but apparently unused — `DATABASE_URL`.** No
`drizzle.config.ts` exists anywhere in the repo, and nothing greps for
`process.env.DATABASE_URL`. CLAUDE.md still says "ORM: Drizzle," but
runtime queries go through the Supabase client directly. This is likely a
stale artifact from an earlier architecture, not something the build
needs — don't spend time hunting for why it's "missing," it's probably
just unused.

---

## 2. Monorepo / native-module build risks — things a Vercel build handles differently from a local one

**(a) Workspace-protocol dependencies — supports the founder's Root
Directory theory directly.** `apps/web/package.json` depends on
`@stellaeum/astrology`, `@stellaeum/core`, `@stellaeum/ui` all via
`workspace:*`. This only resolves correctly if the install step runs with
access to the full monorepo (repo root), not just `apps/web` in
isolation — which is exactly what Vercel's "Root Directory: apps/web" +
"Include source files outside the Root Directory in the Build" toggle
controls. If that toggle is off, or Root Directory is set wrong, the
install step can't see the sibling packages and either fails outright or
resolves stale/missing versions. **This remains a fully live candidate,
not superseded by anything below.**

**(b) `transpilePackages` in `next.config.js` needs the same source
access.** `nativewind`, `react-native-css-interop`, `@stellaeum/astrology`,
`@stellaeum/core` are all transpiled from source, not consumed as
pre-built packages — same dependency on (a) being configured correctly.

**(c) sweph (native N-API module) — survives a Linux build, but only via
a specific mechanism, and there's a real risk that mechanism gets skipped
silently.** `packages/astrology` depends on `sweph@2.10.0-11`. Per its
published package metadata: its `install` script runs `node-gyp-build &&
npm run test` — `node-gyp-build` first checks for a prebuilt binary
matching the target platform/arch/Node ABI (shipped in the npm package via
`prebuildify`), falling back to a real node-gyp compile only if no
matching prebuild exists. Vercel's build image is Linux x64 (or arm64,
depending on project function-region config) — if a matching prebuild
ships for that combination, this "just works" with zero extra
configuration; if not, it needs a full C/C++ toolchain, which Vercel's
build image generally has but isn't guaranteed for every Node/glibc
combination.

**(d) The more concerning risk is upstream of (c) — pnpm 9's default
build-script blocking.** This repo pins `packageManager: pnpm@9.15.4`.
Since pnpm 8+/9, **lifecycle scripts (`preinstall`/`install`/
`postinstall`) of dependencies are blocked by default** unless explicitly
allowlisted via `.npmrc`'s `onlyBuiltDependencies`, or approved
interactively via `pnpm approve-builds`. **No `.npmrc` exists anywhere in
this repo.** A non-interactive CI/Vercel build can't answer an interactive
approval prompt — pnpm's documented behavior in that case is to skip the
script and print a warning, not fail the install outright. If that's
what's happening, sweph's `node-gyp-build` step (and its
`prebuildify`-based binary fetch) never runs, and the native binary is
simply absent — `dictionary-bg` (also native/asset-loading, see
`next.config.js`'s own comment about it) may carry the same risk, though
it's less certain that package has an install script at all.

**What this would look like in the build log**, if it's the cause: a line
resembling `Ignored build scripts: sweph` (pnpm's own wording, may vary
slightly by version) during the install step, followed later by a
module-not-found or native-binding-load error at whatever point the build
actually touches sweph — which, per `next.config.js`'s own extensive
comments, has already been a source of confusing bundler errors on this
exact codebase before (`"path must be string or URL. Received URL"`),
just for different underlying reasons each time.

---

## 3. The single strongest concrete lead — a module-top-level Stripe client construction

`apps/web/lib/stripe/client.ts`:

```ts
export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2026-01-28.clover',
  typescript: true,
})
```

**This runs at module load time, not inside a function** — unlike every
other env-dependent client in this codebase (`lib/supabase/service.ts`'s
`createServiceSupabaseClient()` is a function, called lazily, with a
graceful thrown error if the key's missing). The Stripe Node SDK validates
its API key at construction time and throws synchronously if it's
`undefined` (which `process.env.STRIPE_SECRET_KEY!` becomes if the var
isn't set — the `!` is a TypeScript-only assertion, it does nothing at
runtime).

**Why this can fail a build, not just a request:** Next.js has to load and
evaluate every route module during its build-time page/route collection
step to register it, regardless of that route's `dynamic` export — if
*any* route (API route or Server Component) imports `lib/stripe/client.ts`
directly or transitively, that import executes this module-top-level
`new Stripe(...)` call during the build itself. If `STRIPE_SECRET_KEY`
isn't set in whichever Vercel environment is building (Production and
Preview are configured separately — **check both, not just one**, the
founder's own checklist already flags checking "Clerk key in both
environments," worth applying the same check to every secret, not just
Clerk's), this throws during `next build` and the whole deployment fails
— which matches the observed symptom (100% failure rate) far more cleanly
than an intermittent or partial-failure pattern would.

**What this would look like in the build log**, if it's the cause: an
error during the build (not the install) step, likely referencing
`Stripe` or `lib/stripe/client.ts` in the stack trace, possibly worded
around an invalid or missing API key.

---

## 4. Diagnostic order — read the log against this, don't assume

1. **Open the actual failed build's log** (`npx vercel inspect
   <deployment-id> --logs`, per Vercel's own error message on every failed
   deployment — needs CLI login, which this session doesn't have).
2. **Check which phase failed: Install, or Build.** This alone splits the
   candidate list roughly in half — §2's monorepo/workspace/native-module
   risks are install-phase; §3's Stripe issue and any missing-env-var
   crash are build-phase.
3. **If Install failed:** look for `workspace:` resolution errors first
   (§2a/b — Root Directory / included-source-files theory). Then look for
   `Ignored build scripts` or any sweph/node-gyp-build/prebuildify mention
   (§2c/d).
4. **If Build failed:** search the log for `Stripe` or `stripe/client`
   first (§3 — cheap to rule in or out, and the strongest single lead
   found). If not that, search for which specific env var name appears
   near the error — that tells you directly which of §1's table rows is
   actually missing in that environment, rather than guessing from the
   full list.
5. **Check both Production and Preview environments' env var sets in the
   Vercel dashboard independently** — a var present in one and missing in
   the other produces environment-specific failures, and the founder's own
   working theory already names this exact risk for the Clerk key
   specifically; it applies to every secret in §1's runtime table, not
   just Clerk.
6. **If none of the above matches what the log shows**, the next thing to
   paste back (to continue this diagnostic, not restart it) is the actual
   error text and which phase it occurred in — that's enough to narrow
   further without re-deriving this list from scratch.
