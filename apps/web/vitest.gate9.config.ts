import path from 'node:path'
import { defineConfig } from 'vitest/config'

/**
 * Astrology Phase 2 — Gate 9 runner.
 *
 * Separate from vitest.config.ts because Gate 9 spends real OpenRouter API
 * calls (10 generations against the live placeholder model). It is NOT part
 * of `check:all` / `pnpm test`. Run it deliberately:
 *
 *     pnpm run test:oracle-gate9
 */
export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(__dirname),
    },
  },
  test: {
    include: ['test/gate9/**/*.gate.ts'],
    environment: 'node',
    reporters: ['default'],
    testTimeout: 600_000,
    hookTimeout: 600_000,
  },
})
