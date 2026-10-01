import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@sentry/nextjs', () => ({ captureException: vi.fn() }))

import * as Sentry from '@sentry/nextjs'
import { deletePostHogPerson, deleteRevenueCatCustomer } from '@/lib/gdpr/processor-erasure'

const fetchMock = vi.fn()

beforeEach(() => {
  vi.clearAllMocks()
  vi.stubGlobal('fetch', fetchMock)
  vi.spyOn(console, 'log').mockImplementation(() => {})
  vi.spyOn(console, 'error').mockImplementation(() => {})
})

afterEach(() => {
  vi.unstubAllEnvs()
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

const res = (status: number, body: unknown = {}) =>
  ({ status, ok: status >= 200 && status < 300, json: async () => body }) as Response

describe('deleteRevenueCatCustomer', () => {
  it('skips without calling the network or alerting when the keys are absent (normal in dev/preview)', async () => {
    expect(await deleteRevenueCatCustomer('user_1')).toBe('skipped')
    expect(fetchMock).not.toHaveBeenCalled()
    expect(Sentry.captureException).not.toHaveBeenCalled()
  })

  it('skips when only the key is set but the project ID is missing', async () => {
    vi.stubEnv('REVENUECAT_SECRET_API_KEY', 'sk_x')
    expect(await deleteRevenueCatCustomer('user_1')).toBe('skipped')
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('sends the v2 DELETE with the Clerk ID path-encoded and a Bearer key', async () => {
    vi.stubEnv('REVENUECAT_SECRET_API_KEY', 'sk_x')
    vi.stubEnv('REVENUECAT_PROJECT_ID', 'proj1')
    fetchMock.mockResolvedValueOnce(res(200))

    expect(await deleteRevenueCatCustomer('user_1')).toBe('deleted')
    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toBe('https://api.revenuecat.com/v2/projects/proj1/customers/user_1')
    expect(init.method).toBe('DELETE')
    expect(init.headers.Authorization).toBe('Bearer sk_x')
  })

  it('treats 404 as success (idempotent retry / never purchased)', async () => {
    vi.stubEnv('REVENUECAT_SECRET_API_KEY', 'sk_x')
    vi.stubEnv('REVENUECAT_PROJECT_ID', 'proj1')
    fetchMock.mockResolvedValueOnce(res(404))
    expect(await deleteRevenueCatCustomer('user_1')).toBe('not-found')
    expect(Sentry.captureException).not.toHaveBeenCalled()
  })

  it('never throws: HTTP 500 and network errors alert Sentry and return failed', async () => {
    vi.stubEnv('REVENUECAT_SECRET_API_KEY', 'sk_x')
    vi.stubEnv('REVENUECAT_PROJECT_ID', 'proj1')
    fetchMock.mockResolvedValueOnce(res(500))
    expect(await deleteRevenueCatCustomer('user_1')).toBe('failed')
    fetchMock.mockRejectedValueOnce(new Error('boom'))
    expect(await deleteRevenueCatCustomer('user_1')).toBe('failed')
    expect(Sentry.captureException).toHaveBeenCalledTimes(2)
  })
})

describe('deletePostHogPerson', () => {
  it('skips without calling the network or alerting when the keys are absent', async () => {
    expect(await deletePostHogPerson('user_1')).toBe('skipped')
    expect(fetchMock).not.toHaveBeenCalled()
    expect(Sentry.captureException).not.toHaveBeenCalled()
  })

  it('looks the person up by distinct ID on the app host, then deletes by person ID with events', async () => {
    vi.stubEnv('POSTHOG_PERSONAL_API_KEY', 'phx_x')
    vi.stubEnv('POSTHOG_PROJECT_ID', '42')
    vi.stubEnv('NEXT_PUBLIC_POSTHOG_HOST', 'https://eu.i.posthog.com')
    fetchMock.mockResolvedValueOnce(res(200, { results: [{ id: 'uuid-1' }] })).mockResolvedValueOnce(res(204))

    expect(await deletePostHogPerson('user_1')).toBe('deleted')
    expect(fetchMock.mock.calls[0][0]).toBe('https://eu.posthog.com/api/projects/42/persons/?distinct_id=user_1')
    expect(fetchMock.mock.calls[1][0]).toBe('https://eu.posthog.com/api/projects/42/persons/uuid-1/?delete_events=true')
    expect(fetchMock.mock.calls[1][1].method).toBe('DELETE')
  })

  it('returns not-found without a DELETE when no person has that distinct ID', async () => {
    vi.stubEnv('POSTHOG_PERSONAL_API_KEY', 'phx_x')
    vi.stubEnv('POSTHOG_PROJECT_ID', '42')
    fetchMock.mockResolvedValueOnce(res(200, { results: [] }))
    expect(await deletePostHogPerson('user_1')).toBe('not-found')
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('never throws: a failing lookup alerts Sentry and returns failed', async () => {
    vi.stubEnv('POSTHOG_PERSONAL_API_KEY', 'phx_x')
    vi.stubEnv('POSTHOG_PROJECT_ID', '42')
    fetchMock.mockResolvedValueOnce(res(403))
    expect(await deletePostHogPerson('user_1')).toBe('failed')
    expect(Sentry.captureException).toHaveBeenCalledTimes(1)
  })
})
