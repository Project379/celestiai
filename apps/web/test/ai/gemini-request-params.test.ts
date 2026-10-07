import { readdirSync, readFileSync, statSync } from 'node:fs'
import path from 'node:path'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

// Google deprecation notice (2026-10): `thinking_budget` and the sampling params
// `temperature`, `top_p`, `top_k` return 400 on upcoming Gemini models. These tests
// look at the REAL request body the unmocked @ai-sdk/google provider builds (fetch is
// stubbed, so nothing leaves the machine) rather than at our own option objects.

type Body = { generationConfig?: Record<string, unknown> } & Record<string, unknown>
let bodies: Body[] = []

beforeEach(() => {
  bodies = []
  vi.stubEnv('GEMINI_API_KEY', 'fake-key-for-request-shape-test')
  vi.stubGlobal(
    'fetch',
    vi.fn(async (_url: string, init: { body?: string }) => {
      bodies.push(JSON.parse(init.body as string) as Body)
      return new Response(
        JSON.stringify({
          candidates: [{ content: { role: 'model', parts: [{ text: '{"content":"ok"}' }] }, finishReason: 'STOP', index: 0 }],
          usageMetadata: { promptTokenCount: 1, candidatesTokenCount: 1, totalTokenCount: 2 },
        }),
        { status: 200, headers: { 'content-type': 'application/json' } },
      )
    }),
  )
  vi.resetModules()
})

afterEach(() => {
  vi.unstubAllGlobals()
  vi.unstubAllEnvs()
})

async function send(thinkingLevel: 'low' | 'medium' | 'high') {
  const { generateFinalText } = await import('@/lib/ai/generate-final-text')
  await generateFinalText({ system: 's', prompt: 'p', maxOutputTokens: 100, thinkingLevel })
  expect(bodies).toHaveLength(1)
  return bodies[0]!.generationConfig!
}

describe('Gemini request body (what actually goes on the wire)', () => {
  it.each(['low', 'medium', 'high'] as const)('sends thinkingLevel "%s" and no thinkingBudget', async (level) => {
    const cfg = await send(level)
    const thinking = cfg.thinkingConfig as Record<string, unknown>
    expect(thinking.thinkingLevel).toBe(level)
    expect(thinking).not.toHaveProperty('thinkingBudget')
    expect(thinking.includeThoughts).toBe(false)
  })

  it('sends none of temperature / topP / topK (any casing)', async () => {
    const cfg = await send('low')
    for (const key of ['temperature', 'topP', 'topK', 'top_p', 'top_k']) {
      expect(cfg, key).not.toHaveProperty(key)
    }
  })

  it('assigns a level per call type and never uses "minimal"', async () => {
    // 'minimal' is a 400 on gemini-3.7-flash (the primary model) — probed live 2026-10-07 — so a
    // call using it would silently fail over to the fallback model on every request.
    const { GEMINI_THINKING_LEVEL } = await import('@/lib/ai/generate-final-text')
    expect(GEMINI_THINKING_LEVEL).toEqual({ oracle: 'low', horoscope: 'low', smoke: 'low' })
    expect(Object.values(GEMINI_THINKING_LEVEL)).not.toContain('minimal')
  })
})

describe('no deprecated parameter anywhere in application code', () => {
  const root = path.resolve(__dirname, '../..')
  const skip = new Set(['node_modules', '.next', 'test', 'scripts', '.turbo'])
  function walk(dir: string, out: string[] = []): string[] {
    for (const name of readdirSync(dir)) {
      if (skip.has(name)) continue
      const full = path.join(dir, name)
      if (statSync(full).isDirectory()) walk(full, out)
      else if (/\.(ts|tsx)$/.test(name)) out.push(full)
    }
    return out
  }
  const stripComments = (s: string) => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1')

  it('has no thinkingBudget / temperature / topP / topK / top_p / top_k key in app, lib, components, hooks', () => {
    const offenders: string[] = []
    for (const file of walk(root)) {
      const code = stripComments(readFileSync(file, 'utf8'))
      if (/\b(thinkingBudget|temperature|topP|topK|top_p|top_k)\s*:/.test(code)) {
        // the canvas star-colour code uses the word "temperature" for blackbody physics, not an LLM parameter
        if (/CelestialCanvas\.tsx$/.test(file)) continue
        offenders.push(path.relative(root, file))
      }
    }
    expect(offenders).toEqual([])
  })
})
