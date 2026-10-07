# Commit, Push, and Create PR

Stage the relevant changes, commit, push the current branch, and open a pull request if one is wanted.

## Branches in this repo
- `main` is the working branch and deploys to production on push. Committing to and pushing `main` is the normal flow here; do not refuse it, but never push without the user asking, and state plainly that the push deploys.
- `ui-parity` is the short-lived UI branch: preview deploys only, never merged without the founder's say. Do not open a PR into `main` from it unless asked.
- Run `git branch --show-current` first and say which branch you are on.

## Instructions
1. Run `git status` and `git diff --stat` to see all changes. Never `git checkout -- <file>` over uncommitted edits without diffing first.
2. Stage the relevant files by name (not `git add -A`).
3. Commit with a clear conventional-commit message. End the message with the attribution trailer given in the session's system-reminder (currently `Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>`).
4. Push only when asked. Report any unpushed commits at every pause.
5. Open a pull request only when asked, with a summary of changes. End the PR description with `🤖 Generated with [Claude Code](https://claude.com/claude-code)`.
