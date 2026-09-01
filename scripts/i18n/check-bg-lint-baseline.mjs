#!/usr/bin/env node
/**
 * Enforces the no-new-bg-strings lint rule (packages/config/eslint/
 * no-new-bg-strings.cjs) as a ratcheting baseline: fails only if the
 * count of "Cyrillic literal outside a content-home file" warnings
 * INCREASES beyond BASELINE. Existing debt is grandfathered; new
 * instances are not.
 *
 * Deliberately NOT a blanket `eslint --max-warnings` on each workspace's
 * full lint script — that would conflate this rule's count with
 * unrelated pre-existing warnings (react-hooks/exhaustive-deps, a11y,
 * etc.), making the ceiling meaningless. This counts only
 * no-restricted-syntax violations (which is currently used only for this
 * rule) via ESLint's JSON formatter, summed across all three workspaces.
 *
 * BASELINE recorded 2026-07-30: 1336 (51 packages/core, 752 apps/web,
 * 533 apps/mobile). Originally measured at 1338 the same day, but the
 * cron-endpoint fix (Сесията ти изтече -> plain English 'Unauthorized'
 * for the two CRON_SECRET-guarded, non-user-facing endpoints — see the
 * "Scope note" in STAGE5_PREVENTION.md) removed 2 Cyrillic literals
 * before this baseline was locked in, so it reflects that already rather
 * than starting 2 wider than necessary. See STAGE5_PREVENTION.md for the
 * full writeup. As the namespaced strings-module migration proceeds and
 * literals move out of components into that module, this number should
 * drop — lower BASELINE to match and get a visible "progress, not noise"
 * signal, per the founder's instruction.
 *
 * Raised to 1344 on 2026-08-03 (P.16 — push delivery infra): 8 new,
 * reviewed literals in apps/web/app/api/push/register/route.ts (5 genuinely
 * new user-facing error strings, informal-ти, mirroring the existing
 * push/subscribe and oracle/generate route error-copy pattern) and
 * apps/web/app/api/cron/daily-horoscope/route.ts (title/body extracted to
 * named constants — same two Bulgarian strings that already existed in
 * that file's web-push payload, now also referenced by the new mobile-push
 * path; not new copy, but the literal now appears twice in the AST so the
 * count moved). Deliberate raise, not drift — see REVISIT-26 close note in
 * REVISIT-TRIGGERS.md.
 *
 * Raised to 1371 on 2026-08-04 (REVISIT-53 — mobile profile-field editing):
 * 27 new, reviewed literals across the three new you/settings-{name,email,
 * password}.tsx routes plus the three new row labels added to
 * you/settings.tsx — same outside-content-home shape as those files'
 * existing siblings ((public)/verify.tsx, sign-in.tsx), informal ти,
 * checked against check:bg-strings and the approved-copy lock.
 *
 * Raised to 1613 on 2026-08-04 (Circle-branch recovery, same day): 242 new
 * literals recovered from Petko's implementation-of-final-features branch
 * (d150828) — apps/web/app/api/circle/**, lib/circle/*, components/circle/*,
 * app/connect/[token]/page.tsx, app/(protected)/circle/page.tsx. Not new
 * copy in the sense of freshly written this session — this is existing,
 * previously-unmerged application code being brought into the tree for the
 * first time. Reviewed for the two things this workstream actually checks:
 * spelling (check:bg-strings — 15x "Неоторизиран достъп" replaced with the
 * already-ratified "Сесията ти изтече. Влез отново.", one real typo fixed
 * синстрия -> синастрия, 5 genuine dictionary-gap words allowlisted after
 * individual founder review) and register (one genuine ти/Вие violation in
 * ConnectInviteAcceptance.tsx fixed; the rest of the flagged verbs in
 * report.ts/weather.ts turned out to be correct plural dual-address, not
 * register drift — see STAGE5_PREVENTION.md's Кръг scope note). The
 * remaining Circle UI/design pass (CircleHub.tsx vs krug-v4.html) is
 * deliberately NOT part of this raise — that's separate, deferred work.
 *
 * Raised to 1616 (batch 4 lead-in, copy-lock's first real CI catch): the
 * rule's file scope grew to include apps/web/test/**, which Batch 3 (Vitest
 * coverage) populated with 11 new *.test.ts files, one of which contained a
 * Cyrillic literal ('Тест', a fixture in birth-data.test.ts — test data, not
 * product copy). Test files are the wrong scope for a product-copy check, so
 * this and check:bg-strings/copy-lock's shared extractor were fixed to
 * exclude test directories, __tests__ dirs, and *.test/*.spec files — see
 * TEST_IGNORE_GLOBS in packages/config/eslint/no-new-bg-strings.cjs and the
 * matching IGNORE entries in scripts/i18n/extract-literals.mjs. That
 * exclusion drops 1 (the 'Тест' fixture). The other +3 are real, reviewed,
 * approved copy: two Oracle regenerate strings (Batch 2) and the
 * session-expired string ratified earlier — 1613 + 3 legitimate - 0 (test
 * literal already excluded from this count) = 1616.
 *
 * Raised to 1659 on 2026-08-14 (Batch 4 sub-batch A — Кръг mobile port,
 * hub + saved-profiles): +43. Mobile (+40): new circle.tsx hub, new
 * circle/new.tsx create screen, SavedProfileForm.tsx and
 * SavedProfileDetailPanel.tsx components — almost entirely copy ported
 * verbatim from apps/web/components/circle/{CircleHub,SavedProfileForm}.tsx
 * per the founder's port-faithfully ruling, plus a handful of small
 * newly-written strings flagged for founder review in the batch report
 * (the "+ Нов профил" button and two Alert.alert delete-confirmation
 * strings). Web (+3): the new GET /api/circle/profiles/[profileId]/report
 * route added this batch (mobile has no server-side DB access, so it
 * needs a read path for a report that doesn't burn a rate-limited POST
 * regeneration just to redisplay on screen open) reuses three
 * already-approved error strings, but each is a new AST literal node so
 * the count increases even though no new copy was written.
 *
 * Raised to 1660 on 2026-08-14 (Batch 4 investigation — invite-accept race
 * condition fix, apps/web/app/api/circle/invites/accept/route.ts): +1.
 * Zero new copy. The rewrite adds one more call site for the
 * already-approved 'Не успяхме да приемем поканата.' fallback message (the
 * new atomic-claim UPDATE's own error branch reuses it, on top of the
 * route's pre-existing final catch-all that already had it) — the count
 * moved because the literal now appears twice in the AST, not because
 * anything new was written.
 *
 * Raised to 1719 on 2026-08-14 (Batch 4 sub-batch B — Кръг Connections
 * UI: invite creation, connection-space list/detail, report generation,
 * weather). +59: +55 mobile (new circle.tsx surface toggle + Connections
 * sections, circle/new-connection.tsx, ConnectionSpaceDetailPanel.tsx —
 * almost entirely copy ported verbatim from
 * apps/web/components/circle/CircleHub.tsx per the founder's
 * port-faithfully ruling: TYPE_LABELS, TYPE_BLURB, DOMAIN_LABELS,
 * WEATHER_TONE_LABELS, button/error strings, plus a couple of small
 * newly-written strings flagged for founder review in the batch report
 * ("Име (по избор)" field caption, "+ Нова връзка" button, matching the
 * already-approved "+ Нов профил" pattern from sub-batch A)); +4 web (two
 * new GET routes — /api/circle/relationships and GET on
 * /api/circle/invites — reusing the two already-approved
 * 'Сесията ти изтече...' / route-specific fallback error strings).
 *
 * Raised to 1762 on 2026-08-26 (Tier 1 sweep fixes — quota gap, chart cap):
 * +9, all reviewed, approved copy (see the matching copy-lock.json update
 * in the same commit). +1 in apps/web/app/api/birth-data/route.ts: the new
 * CHART_LIMIT_REACHED 429 message. +8 in
 * apps/web/app/api/horoscope/generate/route.ts: one new message (shared
 * with oracle/generate's existing quota-cap copy via pluralizeBg) written
 * once but referenced at two call sites (checkQuotaAvailable's
 * cap-reached branch and incrementQuotaUsage's race-loss branch) — the
 * rule counts each cooked segment of the template literal separately, so
 * one reviewed string duplicated across two branches counts 4 each, same
 * "moved because the literal now appears twice in the AST" shape as the
 * 2026-08-14 invite-accept raise above.
 *
 * Raised to 1765 on 2026-08-26 (Tier 2 sweep fixes — circle-report version
 * caps + delete/update error-handling sweep): +3, all reviewed, approved
 * copy. +2 new strings: the two circle-report version-cap 429 messages
 * (lib/circle/report.ts's MAX_REPORT_VERSIONS_PER_PAIR, mirroring
 * birth-data's chart-cap shape). +1 AST-count-only: push/unsubscribe's
 * existing 'Грешка при отписването' now appears at a second call site
 * (the newly-checked delete-error branch) — same "literal now appears
 * twice" shape as prior raises in this file's history, not new copy.
 *
 * Lowered to 1754 on 2026-08-26 (Tier 2 #4 — premium metering): -11,
 * progress not drift. oracle/generate and horoscope/generate each
 * duplicated the quota-cap message across two call sites (checkQuotaAvailable
 * branch + incrementQuotaUsage race-loss branch), each counted at 4 AST
 * segments — 8 per route, 16 total. Consolidating both into one shared
 * quotaCapReachedResponse() in lib/subscriptions/quota.ts collapsed that
 * to a single definition site (still outside a content-home glob, so
 * still counted, just once instead of sixteen times) plus the one new
 * premium-tier string, netting -11.
 *
 * Raised to 1755 on 2026-08-26 (Tier 2 #17 — rate limiter fail-closed on
 * money routes): +1, the new 503 message in lib/rate-limit.ts for the
 * failClosed error path (oracle/generate, horoscope/generate, birth-data
 * create).
 *
 * Raised to 1756 on 2026-08-26 (Tier 3 #18 — cities/search injection fix):
 * +1, the existing 'Въведи поне 1 символ' message reused at a second call
 * site (the new empty-after-sanitization guard) — not new copy, the
 * literal now appears twice in the AST, same shape as prior raises in
 * this file's history.
 *
 * Raised to 1800 on 2026-09-01 (frozen tier definition — Oracle gates):
 * +22 across the Oracle conversion surface. New user-facing copy for the
 * free-tier Oracle boundaries the frozen definition introduces (one
 * `general` reading lifetime; love/career/health + regenerate are
 * premium): apps/{web,mobile}/components/oracle/CapReachedNotice.tsx (the
 * reason-branched title/sub pairs, mirrored web and mobile so counted
 * twice), apps/{web,mobile}/components/oracle/TopicCards.tsx (the
 * ' (заключено)' accessibility suffix, matching web TopicCard.tsx's
 * existing use), and apps/web/lib/subscriptions/free-oracle.ts (the three
 * server-side gate messages). Informal ти. Copy was run through the
 * bulgarian-skill and de-calqued — house style: "Четенията за любов,
 * кариера и здраве са в Премиум." / "Ново четене има само в Премиум." /
 * "Това беше безплатното ти четене от Оракула." — matching the existing
 * "неограничени четения от Оракула" / "Отключи Премиум" phrasing in
 * SettingsContent + PricingContent. Through check:bg-strings and
 * copy-lock.
 *
 * Usage: node scripts/i18n/check-bg-lint-baseline.mjs
 */
import { execFileSync } from 'node:child_process'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = resolve(__dirname, '../..')

const BASELINE = 1800

const WORKSPACES = [
  { name: '@stellaeum/core', dir: 'packages/core', target: 'src' },
  { name: '@stellaeum/web', dir: 'apps/web', target: '.' },
  { name: '@stellaeum/mobile', dir: 'apps/mobile', target: '.' },
]

function countViolations(workspace) {
  const cwd = resolve(ROOT, workspace.dir)
  let stdout
  try {
    stdout = execFileSync('npx', ['eslint', workspace.target, '--no-cache', '-f', 'json'], {
      cwd,
      encoding: 'utf8',
      maxBuffer: 64 * 1024 * 1024,
      // Windows resolves `npx` via npx.cmd — execFileSync needs shell:true
      // to find it; without it, spawn fails with ENOENT rather than
      // running eslint. Harmless on POSIX where npx is a direct binary.
      shell: true,
    })
  } catch (err) {
    // eslint exits non-zero when it finds any error/warning — that's
    // expected here (this repo has pre-existing warnings/errors from
    // other rules); stdout still has the JSON report.
    stdout = err.stdout ?? ''
  }

  let results
  try {
    results = JSON.parse(stdout)
  } catch {
    console.error(`[check-bg-lint-baseline] Failed to parse ESLint JSON output for ${workspace.name}`)
    console.error(stdout.slice(0, 2000))
    process.exit(1)
  }

  let count = 0
  const files = []
  for (const file of results) {
    const matches = file.messages.filter((m) => m.ruleId === 'no-restricted-syntax')
    if (matches.length > 0) {
      count += matches.length
      files.push({ path: file.filePath, count: matches.length })
    }
  }
  return { count, files }
}

let total = 0
const perWorkspace = []
for (const ws of WORKSPACES) {
  const { count } = countViolations(ws)
  perWorkspace.push({ name: ws.name, count })
  total += count
}

console.log('[check-bg-lint-baseline] Cyrillic-outside-content-home literal counts:')
for (const { name, count } of perWorkspace) {
  console.log(`  ${name.padEnd(20)} ${count}`)
}
console.log(`  ${'TOTAL'.padEnd(20)} ${total}  (baseline: ${BASELINE})`)

if (total > BASELINE) {
  console.error(
    `\n[check-bg-lint-baseline] FAIL: ${total} > baseline ${BASELINE}. A new Cyrillic literal landed outside an established content-home file.`
  )
  console.error(
    'Either move the new copy into a content-home file / the namespaced strings module, or confirm the file IS a content home and add it to CONTENT_HOME_GLOBS in packages/config/eslint/no-new-bg-strings.cjs.'
  )
  process.exit(1)
}

if (total < BASELINE) {
  console.log(
    `\n[check-bg-lint-baseline] Count dropped below baseline (${total} < ${BASELINE}) — progress! Lower BASELINE in this script to lock it in.`
  )
}

console.log('\n[check-bg-lint-baseline] PASS')
process.exit(0)
