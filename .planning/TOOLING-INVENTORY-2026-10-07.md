---
title: Tooling inventory — skills, commands, agents, scripts, memory
created: 2026-10-07
purpose: Phase 0. What exists in this repo and on this machine, what it is for, and where it is stale or contradicts the register / current decisions. Findings only — nothing here was changed except where marked "fixed".
---

# Tooling inventory (2026-10-07)

Epistemic tags: **[verified]** = I read the file or ran the command today; **[inferred]** = from names/descriptions only.

## 1. Always-loaded instructions

| Item | For | Last touched | Stale / contradicting |
|---|---|---|---|
| `CLAUDE.md` (repo root) | Project guidance loaded every session | 2026-09-28 (git), edited today | **Fixed today (uncommitted, awaiting your diff review):** DB section listed 4 tables (production has 41, all RLS); tree showed `packages/db` (deleted); ORM said Drizzle (removed 2026-04-20); commands said `npm` (repo is pnpm@9.15.4, `check:all` exists); "AI output is a known-weak placeholder, add no workarounds" contradicted SYSTEM-MAP §4 (Gemini via `@ai-sdk/google`, `validate-reading.ts`, sentinel tokens); "Clerk JWT Templates" (code uses `accessToken()`); no mention of Bulgarian-only launch or the founder-approves-Bulgarian rule or `ui-parity`. |
| Memory index + 22 notes (`~/.claude/projects/.../memory/`) | Cross-session preferences and facts | various | **Fixed today:** deleted `project_claude_md_expo_sdk_stale` (CLAUDE.md now correct); `feedback_develop_branch` updated for the sanctioned `ui-parity` exception and all-branch CI; `reference_supabase_cli_connection` updated with today's ledger state. **Still true but worth your eye:** `feedback_no_ui_work` ("skip mockups/styling unless asked") — you have now asked, so it applies only to unrequested UI; `feedback_claude_mem_first` tells me to query the claude-mem MCP, but **no claude-mem tools are available in this session** (only the cleanup hook runs), so that rule cannot be followed — [verified: absent from the tool list]. |
| `.claude/settings.json` | SessionStart hooks (GSD update check, claude-mem port cleanup), GSD statusline | 2026-08-04 | Fine. |
| `.claude/settings.local.json` | Permission allow-list (138 Bash entries) | 2026-08-04 | **Stale [verified]:** allows `npm run db:seed`, `npm run test:e2e`, `npm install/test/build` — none of those exist or apply (pnpm; no e2e script; no seed script). Harmless but misleading; a cleanup candidate (`/fewer-permission-prompts`). |

## 2. Skills — project (`.claude/skills/`)

| Skill | For | Last updated | Stale / contradicts |
|---|---|---|---|
| `bulgarian-skill` | Bulgarian grammar, orthography, style, astrology terminology; "the authority behind this project's Bulgarian copy" | 2026-04-23 | **Contradicts the register in four ways [verified]:** (1) calls Вие the "safest default" (`style-and-expression.md` §1) while the product is **ти only**; (2) every sample sentence in `astrology.md` §7–§9 uses Вие/ви; (3) no rule on spelled-out gender pairs; (4) no clause-level clitic rule, no possessive-with-personified-noun rule. Also has no glossary of product terms and no "new Bulgarian stops for founder approval" rule. **Proposal written, not applied:** `.planning/proposals/BULGARIAN-SKILL-UPDATE.diff` (register row BULGARIAN-SKILL-UPDATE). |
| `mystical-dark-ui` | Generic "dark luxury / astrology" UI template | 2026-07-28 | **Directly contradicts the design language [verified].** It prescribes bordered cards with 12–16px radius and hover lift, `backdrop-filter` glassmorphism, pill buttons and pill category tabs, gold accent, uppercase tracked labels, italic hero titles, gradient divider lines, 80–120px section padding, "Cinzel for headings" (Cyrillic hard rule), 3×4 zodiac card grid. Every one of those is on the anti-pattern list (`DESIGN-LANGUAGE-REFERENCE.md` §5; `DESIGN-RESEARCH` §A.2). It is also what the web app's current look resembles. **It must not be consulted for Stellaeum.** Recommend removing it from this repo (or renaming it `DO-NOT-USE-…`) — your call. |
| `frontend-design` | Generic "bold, distinctive" frontend aesthetics | 2026-04-06 | Pushes "unexpected layouts, asymmetry, dramatic shadows, gradient meshes" — opposite of the restraint rules (R1–R7). Not harmful if the brief overrides it; dangerous if it leads. |
| `ui-ux-pro-max` | Style/palette/font database (67 styles incl. glassmorphism, bento) | 2026-07-28 | Offers styles the brief bans (glassmorphism, bento grid). A lookup tool, not an authority. |
| `web-design-guidelines` | Vercel Web Interface Guidelines review | 2026-04-06 | Consistent with `DESIGN-RESEARCH` §B.1 (delayed spinners, reduced-motion, tabular-nums). Useful as a checklist, not as direction. |
| `react-best-practices`, `react-native-skills` | Vercel performance guidance | 2026-04-06 | No conflicts found [inferred from descriptions + README]; README mentions `npm`. |
| `maintainable-typescript` | Cleanup/refactor discipline | 2026-04-07 | No conflicts [inferred]. |
| `algorithmic-art` | p5.js generative art | 2026-04-06 | Irrelevant to the product. |
| `go` | Verify → simplify → PR | 2026-07-28 | Detects pnpm correctly. Opens a PR; with a main-only single-branch workflow it is only right for `ui-parity`/short branches. |

User-level synced skills (`~/.claude/skills/synced`): one opaque UUID-named bundle, not inspected. Built-in/plugin skills (code-review, simplify, schedule, loop, claude-api, anthropic-skills:*) are Anthropic-provided, not repo content.

## 3. Slash commands (`.claude/commands/`)

| Command | For | Last updated | Stale / contradicts |
|---|---|---|---|
| `commit-push-pr` | Commit → push → PR | 2026-01-11 | **Says "Do not push to main directly"** — contradicts the single-branch workflow (memory: `feedback_develop_branch`: commit to `main` directly or short-lived branches). Also does not add the required Co-Authored-By trailer. |
| `security-check` | Grep for secrets | 2026-01-11 | Generic. CI already runs `secret-scan`/`dep-audit`; fine as a manual check. |
| `create-agent`, `create-command` | Scaffolding | 2026-01-11 | Generic. |
| `gsd/*` (30 commands) | GSD planning workflow (`/gsd:plan-phase` etc.) | 2026-02-18 | Written against a `.planning/` layout (ROADMAP/phase dirs) that the repo only partly follows now — the register (`PLACEHOLDERS.md`) and `SYSTEM-MAP.md` are the real source of truth. `new-project.md.bak` is stray. |

## 4. Agents (`.claude/agents/`, 20 files)

- **GSD family (11, Feb 2026; duplicated in `~/.claude/agents`)** — planner, executor, verifier, debugger, mappers… Tied to the GSD phase structure; several reference `npm`. Stale relative to pnpm and the register.
- **Generic reviewers (Jan 2026):** `claude-md-compliance-checker`, `code-quality-pragmatist`, `code-simplifier`, `Jenny`, `karen`, `task-completion-validator`, `verify-app`, `ultrathink-debugger`. Not project-specific; no conflicts found, but none knows the register, the copy-lock, or the design language.
- **`ui-comprehensive-tester`:** assumes Puppeteer/Playwright/Mobile **MCP servers** [verified: not present in this session]. Cannot do what its description promises here.

## 5. Scripts (`scripts/`) — the real enforcement layer

| Script | For | Note |
|---|---|---|
| `check-bg-static-strings.mjs` + `i18n/bg-speller.mjs`, `bg-allowlist.data.mjs` | Spellcheck of static Cyrillic literals | Catches non-words only — **not** register, gender, calques, or JSX text (JSX-COPY-UNLOCKED). |
| `i18n/check-copy-lock.mjs`, `generate-copy-lock.mjs`, `copy-lock.json`, `extract-literals.mjs` | Locks approved Cyrillic literals | 2,898 entries. Quoted literals only; ~530 web / ~353 mobile JSX-text strings are unlocked. **A passing lock is not founder approval.** |
| `i18n/check-bg-lint-baseline.mjs` | Ratchet on Cyrillic literals outside content homes | Constant 1,716; actual 1,708 — wants lowering. |
| `i18n/check-bg-generated.mjs`, `report-generation-flags.mjs` | Checks on AI-generated Bulgarian | |
| `check-core-strictness`, `check-error-code-collisions`, `check-rpc-contract`, `check-env-consistency`, `check-placeholders` | Gates | `check:placeholders` ties register rows ↔ `STELLAEUM_PLACEHOLDER` markers. |
| `smoke.mjs` | Post-deploy probe (5 checks) | Needs `SMOKE_SECRET` (GitHub secrets only). Runs only on Production deploys. |
| `.github/workflows/ci.yml` | CI | **Widened today** to every push and PR (was main only). `astrology.yml`, `smoke.yml` unchanged. |

## 6. Docs that carry "facts" and have drifted

| Doc | Drift | Status |
|---|---|---|
| `.planning/CC-SESSION-HANDOFF.md` | §2: "eight gates" (now twelve), copy-lock 3,025 (now 2,898), baseline 1,778; §3: ledger "6 rows vs 16 files, 13 unrecorded" (today: 25 rows, 24 files, all 24 recorded, 1 remote-only `full_diary_v2`) | **Fixed today, uncommitted.** |
| `.planning/research/FEATURES.md` | Claims Bulgarian + English at launch | **Fixed today, uncommitted** (Bulgarian only; PROJECT.md and REQUIREMENTS LOC-01 agree). Its price row ("9.99/mo target") disagrees with COMPETITOR_ANALYSIS (€6.99) and MOBILE_UX_RESEARCH (monthly+annual, numbers "placeholders") — **Update 2026-10-07: price locked at €6.99/mo, €59.99/yr by the founder; FEATURES.md and the other docs fixed and PRICE-BASIS closed.** |
| `.planning/SYSTEM-MAP.md` §4 | The claim in CLAUDE.md pointing at it was the stale part; §4 itself was updated 2026-09-06 and is accurate on the model. It does not yet mention the 40–80 s Gemini slowness (register: GEMINI-SLOW-NO-FAILOVER). | Left as is. |
| `.planning/research/COMPETITOR_ANALYSIS.md` | Describes "Cosmic Glassmorphism", `swisseph-wasm`, Skia, web-first, 2026-04-02 | Historical. Its design-language claims are retired. |
| `.planning/research/MOBILE_UX_RESEARCH.md` §9 | Prescribes **card chrome (1px violet border, 16px radius), pill scroll-chips, bento tiles, Cinzel eyebrows** | Contradicted by the later, shipped design language. See DESIGN-BRIEF contradictions. |
| `DESIGN-LANGUAGE-REFERENCE.md` | §1 token table still lists `faint #64748b`; shipped value is `#6d7e97` (corrected 2026-08-27) | Stale value; not fixed (design docs wait for your ruling). |

## 7. Tools available this session

- **Rendering (new today):** `playwright-core` installed in the session scratchpad (outside the repo), driving the system Chrome (`channel: 'chrome'`, headless). `shot.mjs <html> <out.png> [selector|full] [width] [waitMs]`. **Verified:** rendered `oracle-loading-v2.html` and viewed the PNG.
- **Claude in Chrome:** tools exist but the extension was **not connected** when I tried.
- MCP: context7, figma (needs auth), Claude Docs, Gmail/Calendar/Drive (unauthenticated). No claude-mem, no Puppeteer/Playwright MCP.
