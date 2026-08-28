# Verification-surface gaps

**The one lesson, stated plainly: every observation has a scope, and the
scope is usually narrower than it appears.** A check tells you something
true — but only about the exact thing it exercised, which is almost always
less than you read into the green result. This session made the point
three times in three different shapes:

- **#6** — a probe only tests the *code it runs*. A 200 on a static page,
  or a 401 from an auth gate, says nothing about the handler body or the
  compute path behind it.
- **#9** — a monitor only sees the *errors that reach it*. An error a
  route catches and turns into a returned 500 Response never reaches
  Sentry; "the dashboard is clean" is not "production is healthy".
- **#10** — a probe only tests the *deployment you are routed to*. With
  skew protection on, a browser tab can keep hitting an old deployment's
  functions for hours after a fix ships; "deployed the fix, still fails"
  and "the fix isn't being served" look identical from the response.

Before trusting any green result, name what it actually exercised, and
treat everything outside that scope as still unverified.

---

Running list of "the thing you can check easily is not the thing that
decides" — cases where a cheap, local, or convenient check can pass while
the real target environment fails, or vice versa. Distinct from
`.planning/archive/HANDOFF-CC-2026-08-04-EOD.md`'s "ungated things hide problems"
pattern (never-run checks) — this list is about checks that *do* run but
verify the wrong surface. Add an entry whenever a new instance is found;
don't let it re-derive from scratch each time.

## 1. `react-native-web` layout is not a valid proxy for real device layout

Web rendering of shared React Native components via `react-native-web`
does not reproduce actual device layout behavior closely enough to be
trusted as a mobile-layout check. A component that looks correct in a
browser via `react-native-web` is not evidence it's correct on a real
iOS/Android device — box model, flex, and text-measurement differences
mean layout bugs can hide on one surface and appear on the other in
either direction.

## 2. "Passes locally, fails in CI" — a local build passing is not evidence a cloud build will

Named explicitly during the Vercel deployment work (`.planning/archive/CHECKPOINT-2026-08-04.md` §6):
a clean local `next build` isn't the same as a live push actually going
green on Vercel's infrastructure. This pattern bit the session twice
before it was named. Treat "builds locally" as `[inferred, not verified]`
for anything that depends on the target platform's own build environment
(missing env vars, different Node/OS, different dependency resolution)
until an actual deploy is watched succeed.

## 3. Local `expo prebuild` is not a faithful reproduction of EAS Build's environment

Found 2026-08-05 debugging the Android splash-screen resource-linking
failure (`.planning/phases/phase-a-mobile-scaffold/REVISIT-TRIGGERS.md`
item 67). Running `npx expo prebuild --platform android --no-install`
locally, with no splash image configured anywhere, generated a real
(non-empty) `splashscreen_logo.png` — a placeholder bullseye graphic —
at every density. EAS Build, given the identical `app.json`, produced no
such fallback and failed at `:app:processReleaseResources` with the
drawable missing. Local and remote prebuild diverged on a real,
build-outcome-determining detail (probably an environment or image-cache
difference in Expo's own tooling, not chased further since it didn't
change the fix). **A green local `expo prebuild` cannot be trusted as a
pass signal for asset-resolution bugs on this SDK line** — the real
assets must be supplied and the actual EAS build watched, not inferred
from a local run that may be silently compensating for something EAS
won't.

## 4. A status doc's claim decays into a verification surface the moment nobody re-checks it against code

Found 2026-08-13 during a documentation audit. `.planning/PROJECT.md`,
`.planning/ROADMAP.md`, `.planning/STATE.md`, and `.planning/REQUIREMENTS.md`
all sat frozen at a 2026-05-09 "0% progress" snapshot while Phases 3
(birth-data), 4 (astrology engine/charts), 5 (AI oracle), 6 (daily
horoscope), 7 (payments), and 8 (diary persistence) actually shipped in
the following months. Nobody caught it until this audit — the same
failure class as PostHog being documented "locked in" while never
installed, and RLS being called "settled" while eight Supabase tables sat
unprotected: a document asserting a state that was true (or believed
true) once, treated as still-current by anyone who read it, and never
re-verified against the actual codebase as time passed. The difference
from items 1-3 above is *when* the gap opens — those are cross-environment
divergences present from the first run; this one opens gradually, the
longer a status doc goes unread-against-code. A status doc is a
verification surface like any other: trusting it without a recency check
is exactly the "the thing you can check easily is not the thing that
decides" pattern this file exists to track. Refreshed the same day this
was found; see `.planning/COMPLETION-TRACKER.md` for the doc meant to
replace this failure mode going forward — it exists specifically so status
claims stay tied to a verification date, not to when the doc was written.

## 5. With a dev client, local `.env.local` correctness becomes a live runtime dependency, not a build-time one

Found 2026-08-13 during the dev-client build setup. Every EAS `preview`/
production build so far has baked `EXPO_PUBLIC_*` values into the shipped
JS bundle at `eas build` time — a wrong value produces a wrong *artifact*,
which is a one-time, reasoning-about-a-fixed-thing problem. `expo-dev-
client` changes this: once the founder's development-profile APK is
installed, it loads JS from Metro over the network on every launch, and
Metro inlines `EXPO_PUBLIC_*` from whatever `.env.local` sits on the
founder's machine *at that moment*. A wrong or stale value there no longer
produces a knowable bad artifact — it silently changes the running app's
behavior on every reload, with no build step to catch it and no artifact
to diff against. Confirmed **not** an issue for the native/Gradle build
step itself — checked the generated (gitignored) `android/` tree, `eas.json`,
`app.json`, `package.json`, and every config plugin under `apps/mobile/
plugins/` for any `EXPO_PUBLIC_*` read at prebuild/Gradle time and found
none; the only EAS-env value the native build step actually consumes is
`SENTRY_DISABLE_AUTO_UPLOAD` (already present, confirmed via `eas env:list
development`). So the dev-client build itself is safe to run as-is — the
gap is specifically post-install, ongoing: `.env.local` now needs the same
level of trust a production env var would get, not the "it's just local
dev, close enough" treatment it's had until now.

## 6. HTTP checks of pages that don't compute are not evidence the compute paths work

Found 2026-08-27, ~1 hour after Sentry went live in production. The
first production deploy in the project's history was declared healthy on
the basis of: `/` 200, `/privacy` 200, `/pricing` 200, and three API
routes returning clean structured 401s. All true. All meaningless for the
question that mattered. The first real Sentry event was
`Error: Cannot find module 'sweph'` on `GET /connect/[token]` — the Swiss
Ephemeris native module (and, on the same import, `geo-tz`) is not present
in the deployed serverless function, so **every route whose static import
graph reaches `@stellaeum/astrology`'s server entry 500s at module
evaluation.** Confirmed by probing production: `/api/chart/calculate`,
`/api/transits/overview`, `/api/crystals`, `/api/circle/*` (9 of 10
route files), `/connect/[token]`, `/api/oracle/generate`,
`/api/horoscope/generate` all return 500. The site *looked* fine because
every page checked was a static render (`/`, `/privacy`, `/pricing`) or an
auth gate that rejects before the handler body — none of them exercise a
chart calculation.

Why this is the strongest instance of the pattern so far: the checks that
passed were not lazy or careless. They were deliberate, they were real
HTTP requests against real production, and they returned exactly what a
healthy deploy would return. The 401s in particular *look* like proof the
route works — the route loaded, ran, and auth-gated. But a Next.js route
handler with a **static** `import` that fails to resolve throws at module
evaluation, which for an auth-gated route still happens on first request
regardless of the 401 — so a 401 only proves the auth middleware ran, not
that the handler's own module graph is intact. A route that imports a
broken module *dynamically* (`await import(...)` inside the handler, as
`/api/horoscope/generate` does for astrology) will even pass a unauthed
probe and only fail when that specific code path executes.

The rule: **an endpoint probe is evidence only for the code that the probe
actually runs.** A 200 on a static page says nothing about API routes. A
401 says nothing about the handler body. A 200 on a handler that
short-circuits (cache hit, early return) says nothing about the cold path.
To verify a compute path, you have to hit the compute path — with a real
authed request that reaches the calculation, against the real deployed
artifact, or by inspecting the deployed function's `node_modules` for the
files the code will `require()` at runtime. `pnpm build` locally resolves
`sweph` through the pnpm symlink graph and proves nothing about what
`@vercel/nft` traced into the Lambda.

## 7. Build-time constant inlining freezes a bundled module's runtime file paths to the build machine

Found 2026-08-27, same outage as #6 but a distinct mechanism. After
`sweph`/`geo-tz` were fixed, `POST /api/horoscope/generate` and
`/api/oracle/generate` kept 500ing. `scripts/i18n/bg-speller.mjs` computes
its allowlist path at module scope as
`resolve(dirname(fileURLToPath(import.meta.url)), 'bg-allowlist.txt')`. It
is **bundled** by webpack for the Next.js server build (not in
`serverExternalPackages`), and reading the built chunk
(`.next/server/chunks/4585.js`) showed webpack had replaced
`import.meta.url` with a **literal absolute string** —
`"file:///C:/Users/ntone/Desktop/sub-project/scripts/i18n/bg-speller.mjs"`,
the build machine's path. At runtime the code therefore did
`readFileSync("C:/Users/.../bg-allowlist.txt")` → ENOENT on Vercel's Linux
filesystem. **This fails regardless of build OS** — a Vercel-built bundle
freezes `/vercel/path0/...` (the build workspace), which also does not
exist in the Lambda runtime (`/var/task/...`).

This is a **third distinct class**, after "module not traced" (#6 for
`sweph`) and "sidecar asset not copied" (#6 for `geo-tz`'s `.geo.dat` /
`dictionary-bg`'s `.aff`/`.dic`). It is the only one where **the file
being present proves nothing** — `outputFileTracingIncludes` copied
`bg-allowlist.txt` into the function correctly; the code just never looked
there, because the path it computed was frozen at build time. Trace
inspection (the fix for #6) does not catch this; you have to read the
bundled chunk for an inlined build-machine path, or hit the code path in
production.

Asymmetry worth remembering: the **same file** does
`createRequire(import.meta.url)('sweph')` for native-module resolution and
that **works**, because Next.js specifically shims `createRequire` from
`import.meta.url` for this documented native-module case. `import.meta.url`
used for module *resolution* is handled; used to build a path for
*reading an asset* is not. `packages/astrology/src/{calculator,transit,
utils/julian-day}.ts` all use the `createRequire(import.meta.url)` form
and are verified working in production — same shape, different outcome.

The rule: **any `import.meta.url` / `__dirname` / `process.cwd()` used to
locate a file for `readFileSync`/`readFile` at module scope in code that
webpack bundles is broken on Vercel and invisible until it 500s.** The fix
is not tracing — it is to remove the runtime file read entirely (inline
the data as a bundled module: `bg-allowlist.txt` → `bg-allowlist.data.mjs`
exporting a constant). Grep for the shape before trusting a deploy;
2026-08-27's sweep found exactly one broken instance (this one) and one
same-shape-but-shimmed pattern (the `createRequire` trio).

## 8. The founder's own browser is not a reliable observation post for client-side telemetry (ad blocker eats the Sentry tunnel)

Found 2026-08-27 while chasing the §0.7 production error. The founder's
browser Sentry console showed `net::ERR_BLOCKED_BY_CLIENT` on requests to
`/monitoring` — the same-origin Sentry tunnel route (`tunnelRoute:
'/monitoring'` in `next.config.js`, configured specifically to get *past*
`connect-src` CSP and ad blockers). An ad blocker with a broad
"analytics/telemetry" filter list matches `/monitoring` anyway and drops
it. **Consequence: client-side Sentry events from the founder's own
sessions may never leave the browser.** Anything "verified working"
client-side by watching the founder's browser — an error not appearing, a
capture "succeeding", a page "not throwing" — is unreliable evidence,
because the transport is being blocked locally and silently.

This does **not** affect server-side events from API routes (those go
`Sentry.init({ dsn: SENTRY_DSN })` → `sentry.io` directly from the Lambda,
no browser involved) — but it does mean:
- Client-side error monitoring cannot be validated from the founder's
  primary browser. Use a clean browser / private window with no
  extensions, or a different device/network, or check server-side.
- If a client-side bug is "not in Sentry", that is not evidence it did not
  happen — check whether the tunnel is being blocked first.
- The earlier "web browser Sentry verified live" note (COMPLETION-TRACKER
  §5) was verified by *inspecting the production bundle* (DSN inlined,
  `sentry-trace` meta tags present), not by confirming events actually
  arrive — which, from the founder's browser, they may not.

Distinct from items 1–7: those are build/environment fidelity gaps. This
one is that **the human's own diagnostic instrument is filtered**, so
"I checked and it's fine" carries a hidden asterisk for anything the
filter touches.

## 9. A handled error that returns a 500 Response is invisible to Sentry — "no event" ≠ "no error"

Found 2026-08-27 chasing the §0.8 `/api/horoscope/generate` 500. The error
was in Vercel Runtime Logs within seconds; Sentry had nothing for the
release. That is not a Sentry misconfiguration — it is structural:

- Next.js reports route errors to Sentry via `onRequestError`
  (`instrumentation.ts` exports `Sentry.captureRequestError`). That hook
  fires **only for errors that propagate uncaught out of the handler.**
- `apps/web/lib/auth/guards.ts`'s `toErrorResponse(error, msg)` **catches**
  the error and **returns** `Response.json({ error: msg }, { status: 500 })`
  for anything that isn't an `ApiError`. A returned Response is a normal
  return — nothing is thrown — so `onRequestError` never sees it.
- Its only telemetry is a `console.error` inside `toErrorResponse`, and
  `sentry.server.config.ts` has no console-capture integration, so that
  goes to Vercel logs and nowhere else.
- Six routes use `toErrorResponse` (`cities/search`, `horoscope/generate`,
  `oracle/generate`, `stripe/{cancel,checkout,portal}`). Every non-`ApiError`
  500 in any of them is Sentry-blind.

The trap: treating "the Sentry dashboard is clean" as "production is
healthy." Sentry only sees what is *thrown*; anything a route catches and
turns into a 4xx/5xx Response — which is most deliberate error handling —
is not there. For a real picture you need Vercel Runtime Logs (or a
wrapper that explicitly `Sentry.captureException`s before returning the
Response). Related to #6's "an endpoint probe is evidence only for the
code it runs" — this is the monitoring-side version: **an error monitor is
evidence only for the errors that reach it, and 'handled' errors don't.**

## 10. Vercel Skew Protection can serve an OLD deployment's functions to a browser that loaded before the deploy

Found 2026-08-27. A probe against a freshly-deployed fix (`4f751d2`) came
back with a stack trace byte-identical to the pre-fix build and none of
the new code's side effects (a debug log line, a changed status code).
Cause: **Skew Protection is enabled** (production HTML contains
`?dpl=dpl_…` on its asset/action URLs). With it on, Vercel pins a client
to the deployment that served its HTML for the configured window (12h
here); every `fetch()` from that page — including the app's own API calls
— carries `?dpl=<that-deployment>` and is routed to *that deployment's*
serverless functions, not the current one. A tab left open across a
deploy keeps hitting the old functions.

Consequence for debugging: **every probe from a long-lived browser tab is
evidence about whatever deployment that tab is pinned to, which may not be
the latest.** "I deployed the fix and it still fails" can mean the fix is
wrong OR the fix isn't being served. They are indistinguishable from the
response alone. Discriminators: check the current Production deployment's
commit in the dashboard; hit the deployment's own unique `*.vercel.app`
URL (bypasses skew routing); or open a clean browser session. A fresh
`curl` also hits latest (it sends no `dpl`).

Recommendation while the founder is the only user and actively iterating:
**disable Skew Protection.** It exists to keep real users on a consistent
version mid-session during a rollout; during solo pre-launch debugging it
only produces stale-function confusion. Re-enable before real traffic.

Related to #6 and #9: all three are "the thing you observed is not
evidence about the thing you think." #6 — a probe only exercises the code
it runs. #9 — a monitor only sees errors that reach it. #10 — a probe only
tests the deployment you're actually routed to.

## 11. A synthetic probe's error is indistinguishable in the monitor from a real user's

Found 2026-08-28. While verifying the §0.6/§0.7 allowlist fixes, the
founder ran a bodiless `fetch()` at `POST /api/horoscope/generate`.
`await req.json()` on an empty body throws `SyntaxError: Unexpected end of
JSON input`, which reached `toErrorResponse` and — now that #9's fix wired
`Sentry.captureException` into that path — produced a **High-priority
Sentry alert** carrying no marker that it was self-generated. It reads
exactly like a real user hitting a broken endpoint. This is the fourth
distinct thing chased on this one route, and the second that was never a
real product defect (the first: §0.8's phantom, a stale-deployment stack
trace). The route itself has been fine since §0.7; what kept generating
"errors" was probing and skew.

Two gaps here, related but separate:
- **Monitoring cannot tell test traffic from real traffic.** Today the
  only person generating traffic is the founder, so every alert is
  self-inflicted and this is merely noise. Once there are real users, a
  probe-driven alert and a user-driven alert are the same event, and
  triage will waste time on synthetic ones — or, worse, learn to ignore
  the category that also contains real failures.
- **The fix belongs before the traffic starts, as a build requirement —
  not a follow-up.** Probe/smoke traffic must be identifiable at the
  monitor: a header (`x-stellaeum-probe: 1`), a query param, or a
  dedicated synthetic user/DSN environment — something `beforeSend` in
  `sentry.server.config.ts` can tag or drop. The post-deploy smoke test
  (COMPLETION-TRACKER "Post-deploy smoke test" item) generates exactly
  this error-shaped traffic on every deploy, so **identifiability is a
  hard requirement of that item's design**: ship the `beforeSend` filter
  and the probe marker in the same change as the smoke script, or the
  smoke test is a machine for manufacturing indistinguishable false
  alarms.

Distinct from #6/#9/#10: those are "the observation's scope is narrower
than it looks." This one is "the observation's *origin* is invisible" —
the monitor faithfully recorded a real error; it just can't say the error
was manufactured.

## The underlying pattern across items 1-3 (environment-fidelity gaps)

Convenience/local/cheap verification surfaces (a browser via
`react-native-web`, a local build, a local prebuild) are not neutral
stand-ins for the real target (a device, a cloud build environment, EAS's
own prebuild). Each one can diverge from the real target in either
direction — hiding a real bug, or manufacturing a fake pass — and the
divergence is usually invisible until the real target is actually run.
Treat any of these as `[inferred, not verified]` for exactly the class of
bug the local check happens not to reproduce; don't extend that
uncertainty to unrelated checks the local surface genuinely does cover
well (e.g., TypeScript errors, most logic bugs — those are real local
signal, this list is specifically about environment/build/layout-fidelity
gaps).
