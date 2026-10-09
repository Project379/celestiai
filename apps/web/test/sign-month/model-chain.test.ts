import { beforeEach, describe, expect, it, vi } from 'vitest'

/**
 * Monthly cron model chain (founder, 2026-10-09): pro first, then flash with the editor pass, then
 * evergreen. A model outage is reported ONCE per run (one Sentry event, not one per sign), and so is
 * a missing migration. Flow tested with the generator and the database faked.
 */

const gen = vi.hoisted(() => ({ calls: [] as { model: string | undefined; allowFallback?: boolean }[], proDown: true }))
const sentry = vi.hoisted(() => ({ messages: [] as { msg: string; level?: string }[], exceptions: 0 }))
const db = vi.hoisted(() => ({ result: { data: [] as unknown, error: null as unknown } }))

vi.mock('@/lib/sign-month/generate', async (importOriginal) => {
  const real = await importOriginal<typeof import('@/lib/sign-month/generate')>()
  return {
    ...real,
    generateSignMonthText: vi.fn(async (_sign: string, _ym: string, _used: string[], opts: { model?: string; allowFallback?: boolean }) => {
      gen.calls.push({ model: opts.model, allowFallback: opts.allowFallback })
      if (opts.model === 'gemini-3.1-pro-preview' && gen.proDown) throw new Error('pro is down')
      return { ok: true, content: `Текст от ${opts.model ?? 'flash'}. Втори.`, model: opts.model ?? 'flash', attempts: 1 }
    }),
  }
})
vi.mock('@sentry/nextjs', () => ({
  captureException: vi.fn(() => {
    sentry.exceptions += 1
  }),
  captureMessage: vi.fn((msg: string, ctx?: { level?: string }) => {
    sentry.messages.push({ msg, level: ctx?.level })
  }),
  getCurrentScope: () => ({ setTag: vi.fn() }),
}))
vi.mock('@/lib/auth/cron-secret', () => ({ verifyCronSecret: () => true }))
vi.mock('@/lib/supabase/service', () => {
  const chain: unknown = new Proxy(
    {},
    {
      get(_t, prop: string) {
        if (prop === 'then') return (resolve: (v: unknown) => void) => resolve(db.result)
        return () => chain
      },
    },
  )
  return { createServiceSupabaseClient: () => ({ from: () => chain }) }
})

import { GET as cronGet } from '@/app/api/cron/sign-month/route'

const run = (query = 'phase=generate&month=2026-11') =>
  cronGet(new Request(`http://x/api/cron/sign-month?${query}`, { headers: { Authorization: 'Bearer s' } }))

beforeEach(() => {
  process.env.CRON_SECRET = 's'
  delete process.env.RESEND_API_KEY
  gen.calls = []
  gen.proDown = true
  sentry.messages = []
  sentry.exceptions = 0
  db.result = { data: [], error: null }
})

describe('monthly cron model chain', () => {
  it('uses pro first and does not let the SDK silently swap models under it', async () => {
    gen.proDown = false
    await run()
    expect(gen.calls[0]).toEqual({ model: 'gemini-3.1-pro-preview', allowFallback: false })
  })

  it('falls back to flash for the rest of the run when pro is down, with ONE pro Sentry event', async () => {
    const body = await (await run()).json()
    // 12 signs: the first tries pro (fails) then flash; the other 11 go straight to flash.
    expect(gen.calls.filter((c) => c.model === 'gemini-3.1-pro-preview')).toHaveLength(1)
    expect(gen.calls.filter((c) => c.model === undefined)).toHaveLength(12)
    expect(body.generated).toBe(12)
    expect(body.modelOutages).toEqual(['gemini-3.1-pro-preview'])
    const outage = sentry.messages.filter((m) => m.msg.includes('gemini-3.1-pro-preview'))
    expect(outage).toHaveLength(1)
    expect(sentry.exceptions).toBe(0)
  })

  it('every model down: no row is written, evergreen shows, still one outage event', async () => {
    vi.mocked((await import('@/lib/sign-month/generate')).generateSignMonthText).mockImplementation(async (_s, _y, _u, opts) => {
      gen.calls.push({ model: opts?.model, allowFallback: opts?.allowFallback })
      throw new Error('down')
    })
    const body = await (await run()).json()
    expect(body.generated).toBe(0)
    expect(sentry.messages.filter((m) => m.msg.includes('unavailable this run'))).toHaveLength(1)
  })
})

describe('one Sentry warning per run for config problems', () => {
  it('missing migration: one warning, nothing generated', async () => {
    db.result = { data: null, error: { code: '42P01' } }
    const body = await (await run()).json()
    expect(body.skipped).toBe(true)
    expect(gen.calls).toHaveLength(0)
    expect(sentry.messages).toHaveLength(1)
    expect(sentry.messages[0]!.level).toBe('warning')
  })

  it('missing email config: one event for the whole run, however many texts', async () => {
    gen.proDown = false
    delete process.env.SIGN_MONTH_VETO_SECRET
    // all twelve already there and un-emailed
    const signs = ['aries', 'taurus', 'gemini', 'cancer', 'leo', 'virgo', 'libra', 'scorpio', 'sagittarius', 'capricorn', 'aquarius', 'pisces']
    db.result = { data: signs.map((sign) => ({ sign, content: 'Тест. Втори.', status: 'pending', emailed_at: null })), error: null }
    const body = await (await run()).json()
    expect(body.email).toBe('failed')
    expect(sentry.messages.filter((m) => m.msg.includes('review email') || m.msg.includes('VETO_SECRET'))).toHaveLength(1)
  })
})
