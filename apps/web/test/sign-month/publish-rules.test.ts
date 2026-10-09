import { beforeEach, describe, expect, it, vi } from 'vitest'

/**
 * The monthly sign text publish rules (founder, 2026-10-09): users never see pending or rejected
 * texts; a rejected / missing text shows the approved evergreen one; a month in the future is
 * refused; the veto link never acts on GET; texts publish only if the founder was emailed.
 */

interface Call {
  method: string
  args: unknown[]
}
const state = vi.hoisted(() => ({
  calls: [] as { method: string; args: unknown[] }[],
  result: { data: null as unknown, error: null as unknown },
}))

// A chainable, awaitable fake of the supabase query builder that records every call.
function fakeQuery() {
  const chain: Record<string, unknown> = {}
  const proxy: unknown = new Proxy(chain, {
    get(_t, prop: string) {
      if (prop === 'then') {
        return (resolve: (v: unknown) => void) => resolve(state.result)
      }
      return (...args: unknown[]) => {
        state.calls.push({ method: prop, args })
        return proxy
      }
    },
  })
  return proxy
}
vi.mock('@/lib/supabase/service', () => ({ createServiceSupabaseClient: () => ({ from: () => fakeQuery() }) }))
vi.mock('@clerk/nextjs/server', () => ({ auth: async () => ({ userId: 'user_1' }) }))
vi.mock('@/lib/rate-limit', () => ({ assertRateLimit: async () => undefined }))
vi.mock('@/lib/auth/cron-secret', () => ({ verifyCronSecret: () => true }))
vi.mock('@sentry/nextjs', () => ({
  captureException: vi.fn(),
  captureMessage: vi.fn(),
  getCurrentScope: () => ({ setTag: vi.fn() }),
}))

import { GET as getSignMonth } from '@/app/api/sign-month/route'
import { GET as cronGet } from '@/app/api/cron/sign-month/route'
import { GET as vetoGet, POST as vetoPost } from '@/app/api/sign-month/veto/route'
import { SIGN_MONTH_EVERGREEN } from '@/lib/sign-month/evergreen'
import { sofiaYearMonth, nextYearMonth } from '@/lib/sign-month/month'
import { buildReviewEmail, vetoUrl } from '@/lib/sign-month/review-email'
import { signVetoToken, verifyVetoToken } from '@/lib/sign-month/veto-token'

const THIS_MONTH = sofiaYearMonth(new Date())
const called = (method: string) => state.calls.filter((c: Call) => c.method === method)

beforeEach(() => {
  state.calls = []
  state.result = { data: null, error: null }
  process.env.SIGN_MONTH_VETO_SECRET = 'test-secret'
})

describe('GET /api/sign-month', () => {
  const req = (month: string, sign = 'libra') => new Request(`http://x/api/sign-month?sign=${sign}&month=${month}`)

  it('asks the database for published rows only', async () => {
    state.result = { data: { content: 'Текст.' }, error: null }
    const res = await getSignMonth(req(THIS_MONTH))
    expect(res.status).toBe(200)
    expect(called('eq')).toContainEqual({ method: 'eq', args: ['status', 'published'] })
  })

  it('serves the evergreen text when there is no published row (rejected, pending or missing)', async () => {
    state.result = { data: null, error: null }
    const body = await (await getSignMonth(req(THIS_MONTH))).json()
    expect(body).toEqual({ content: SIGN_MONTH_EVERGREEN.libra, source: 'evergreen' })
  })

  it('serves the evergreen text while the table does not exist yet', async () => {
    state.result = { data: null, error: { code: '42P01' } }
    const res = await getSignMonth(req(THIS_MONTH, 'leo'))
    expect((await res.json()).content).toBe(SIGN_MONTH_EVERGREEN.leo)
  })

  it('refuses a month after the current one, without touching the database', async () => {
    const res = await getSignMonth(req(nextYearMonth(THIS_MONTH)))
    expect(res.status).toBe(404)
    expect(state.calls).toHaveLength(0)
  })
})

describe('veto link', () => {
  const token = () => signVetoToken('libra', '2026-11', 'test-secret')
  const url = (t = token()) => `http://x/api/sign-month/veto?sign=libra&month=2026-11&t=${t}`

  it('verifies only the exact token for that sign and month', () => {
    expect(verifyVetoToken('libra', '2026-11', token(), 'test-secret')).toBe(true)
    expect(verifyVetoToken('aries', '2026-11', token(), 'test-secret')).toBe(false)
    expect(verifyVetoToken('libra', '2026-12', token(), 'test-secret')).toBe(false)
    expect(verifyVetoToken('libra', '2026-11', 'x'.repeat(64), 'test-secret')).toBe(false)
    expect(verifyVetoToken('libra', '2026-11', token(), undefined)).toBe(false)
  })

  it('GET shows a confirm page and writes nothing', async () => {
    state.result = { data: { content: 'Текст.', status: 'pending' }, error: null }
    const res = await vetoGet(new Request(url()))
    expect(res.status).toBe(200)
    expect(await res.text()).toContain('Reject this text')
    expect(called('update')).toHaveLength(0)
  })

  it('GET with a bad token is refused and reads nothing', async () => {
    const res = await vetoGet(new Request(url('bad')))
    expect(res.status).toBe(403)
    expect(state.calls).toHaveLength(0)
  })

  it('POST rejects the text', async () => {
    state.result = { data: [{ sign: 'libra' }], error: null }
    const res = await vetoPost(new Request(url(), { method: 'POST' }))
    expect(res.status).toBe(200)
    const update = called('update')[0]!
    expect((update.args[0] as { status: string }).status).toBe('rejected')
  })
})

describe('cron publish phase', () => {
  const run = () =>
    cronGet(new Request(`http://x/api/cron/sign-month?phase=publish&month=${THIS_MONTH}`, { headers: { Authorization: 'Bearer s' } }))

  it('publishes only pending rows the founder was emailed about, never rejected ones', async () => {
    process.env.CRON_SECRET = 's'
    state.result = { data: [], error: null }
    await run()
    const upd = called('update')[0]!
    expect((upd.args[0] as { status: string }).status).toBe('published')
    expect(called('eq')).toContainEqual({ method: 'eq', args: ['status', 'pending'] })
    expect(called('not')).toContainEqual({ method: 'not', args: ['emailed_at', 'is', null] })
  })
})

describe('cron generate phase: fail closed', () => {
  it('does not stamp emailed_at when the review email could not be sent', async () => {
    process.env.CRON_SECRET = 's'
    process.env.NEXT_PUBLIC_APP_URL = 'https://example.com'
    delete process.env.RESEND_API_KEY
    const rows = Object.keys(SIGN_MONTH_EVERGREEN).map((sign) => ({
      sign,
      content: 'Новолунието отваря път. Усети.',
      status: 'pending',
      emailed_at: null,
    }))
    state.result = { data: rows, error: null }
    const res = await cronGet(
      new Request(`http://x/api/cron/sign-month?phase=generate&month=2026-11`, { headers: { Authorization: 'Bearer s' } }),
    )
    expect((await res.json()).email).toBe('failed')
    expect(called('update')).toHaveLength(0)
  })
})

describe('review email', () => {
  it('lists every text with its own signed veto link and names the evergreen signs', () => {
    const mail = buildReviewEmail({
      month: '2026-11',
      rows: [{ sign: 'aries', content: 'Новолунието отваря път. Усети.' }],
      evergreenSigns: ['taurus'],
      baseUrl: 'https://example.com/',
      secret: 'test-secret',
    })
    expect(mail.text).toContain(vetoUrl('https://example.com', 'aries', '2026-11', 'test-secret'))
    expect(mail.html).toContain('Овен')
    expect(mail.text).toContain('Телец')
    expect(mail.subject).toContain('2026-11')
  })
})
