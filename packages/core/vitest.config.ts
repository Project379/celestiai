import { defineConfig } from 'vitest/config'

// STELLAEUM_PLACEHOLDER: CORE-TESTS — first suite added 2026-09-06
// (subscription/tier.ts, diary/prompts.ts); most of this package's ~30
// other exported modules still have no tests. See .planning/PLACEHOLDERS.md.
export default defineConfig({
  test: {
    include: ['test/**/*.test.ts'],
    reporters: ['default'],
    testTimeout: 30_000,
  },
})
