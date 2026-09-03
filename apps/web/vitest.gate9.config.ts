import { readFileSync } from 'node:fs'
import path from 'node:path'
import { defineConfig } from 'vitest/config'

/**
 * Astrology Phase 2 — Gate 9 runner.
 *
 * Separate from vitest.config.ts because Gate 9 spends real Gemini API
 * calls (10 generations against the live model, via the real
 * generateFinalText() code path — apps/web/lib/ai/generate-final-text.ts).
 * It is NOT part of `check:all` / `pnpm test`. Run it deliberately:
 *
 *     pnpm run test:oracle-gate9
 *
 * ENV: the harness calls generateFinalText() directly rather than
 * hand-rolling a fetch, so client.ts's `gemini` provider needs
 * GEMINI_API_KEY in process.env at IMPORT time (module-level
 * createGoogleGenerativeAI call) — a plain `vitest run` does not load
 * .env.local the way Next.js dev/build does, so this config reads it here
 * (Node config-eval time, before any test file imports run) and injects
 * it via `test.env`.
 */
function loadDotEnvLocal(): Record<string, string> {
  try {
    const raw = readFileSync(path.resolve(__dirname, '.env.local'), 'utf8')
    const env: Record<string, string> = {}
    for (const line of raw.split('\n')) {
      const match = /^([A-Z0-9_]+)=(.*)$/.exec(line.trim())
      if (!match) continue
      const [, key, value] = match
      env[key!] = value!.trim().replace(/^["']|["']$/g, '')
    }
    return env
  } catch {
    return {}
  }
}

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
    env: loadDotEnvLocal(),
  },
})
