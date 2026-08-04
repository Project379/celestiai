---
name: go
description: Verify work end-to-end, simplify the diff, and open a PR. Use this when the user says "/go" or asks to ship/finish/PR the current task.
---

# /go

Run after implementation work is complete. This skill verifies the code actually works, cleans it up, and opens a PR — so when the user comes back to a long-running session they know the work is real.

## Steps

### 1. Verify the work

Run the test suite. Detect the package manager from the lockfile:

- `pnpm-lock.yaml` → `pnpm test`
- `yarn.lock` → `yarn test`
- `package-lock.json` → `npm test`

If none exist, check `package.json` for the `packageManager` field. If still ambiguous, ask the user before running anything.

Also run, if the scripts exist in `package.json`:

- `<pm> run typecheck` (or `tsc --noEmit` if TypeScript is present)
- `<pm> run lint`

### 2. Stop on failure

If **any** check fails:

- Stop immediately. Do not attempt fixes. Do not proceed to simplify or PR.
- Report clearly: what ran, what failed, and the relevant error output (not a giant dump — the signal, not the noise).
- Hand control back to the user. They decide what to do next.

The point of this skill is verification. A skill that silently tries to fix failures is a skill that silently hides them.

### 3. Simplify

Only reached if everything in step 1 passed.

If a `/simplify` skill is available in this Claude Code installation, invoke it.

Otherwise, review the diff (`git diff <base>...HEAD`) for:

- Dead code, unused imports, commented-out blocks
- Obvious duplication introduced by the change
- Overly clever one-liners that hurt readability
- Leftover debug logs, `console.log`, `TODO` markers from this session

Make small, safe simplifications only. If something looks wrong but fixing it is non-trivial, note it in the PR description rather than refactoring.

After simplifying, re-run the test suite one more time to confirm nothing broke. If it breaks, stop and report (same rule as step 2).

### 4. Open the PR

Use `gh` CLI. Steps:

1. `git status` — confirm clean or only intended changes staged
2. `git log <base>..HEAD --oneline` — review commit history
3. If commits are messy (WIP, fixup, typo fixes), offer to squash before pushing. Do not squash without confirmation.
4. `git push -u origin <branch>`
5. `gh pr create` with:
   - **Title**: imperative mood, ≤72 chars, summarizes the change (not the task)
   - **Body** with these sections:
     - `## Summary` — what changed and why, 2-4 sentences
     - `## Testing` — which checks were run and that they pass
     - `## Notes` — anything the reviewer should know: assumptions, follow-ups, things deliberately out of scope

### 5. Report back

Output the PR URL and a one-line summary. Done.

## Failure modes to avoid

- Opening a PR when tests are red. Never.
- Attempting to "fix" failures — that's not this skill's job.
- Force-pushing over someone else's commits — if `git status` shows unexpected remote state, stop and ask.
- Squashing without permission.
- Running `gh pr create` on the default branch. If `HEAD` is `main`/`master`, stop and ask the user which branch to create.
