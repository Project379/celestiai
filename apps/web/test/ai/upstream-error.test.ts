import { describe, expect, it } from 'vitest'
import { isUpstreamAiError } from '@/lib/ai/client'

/**
 * COMPLETION-TRACKER §0.8: the `ai` SDK does NOT wrap a non-JSON provider
 * response — `JSON.parse('')` throws a raw `SyntaxError` straight out of
 * `generateText`. `isUpstreamAiError` is what lets the oracle/horoscope
 * routes turn that (and other transport failures) into a deliberate 502
 * instead of an opaque 500, while a genuine bug in our code still 500s.
 */
describe('isUpstreamAiError', () => {
  it('treats a raw SyntaxError as upstream (the §0.8 empty-body case)', () => {
    expect(isUpstreamAiError(new SyntaxError('Unexpected end of JSON input'))).toBe(true)
  })

  it('treats a fetch/network TypeError as upstream', () => {
    expect(isUpstreamAiError(new TypeError('fetch failed'))).toBe(true)
    expect(isUpstreamAiError(new TypeError('read ECONNRESET'))).toBe(true)
  })

  it('treats the ai SDK APICallError / RetryError by name as upstream', () => {
    const apiCallError = Object.assign(new Error('Bad gateway'), { name: 'APICallError' })
    const aiApiCallError = Object.assign(new Error('Bad gateway'), { name: 'AI_APICallError' })
    const retryError = Object.assign(new Error('exhausted retries'), { name: 'AI_RetryError' })
    expect(isUpstreamAiError(apiCallError)).toBe(true)
    expect(isUpstreamAiError(aiApiCallError)).toBe(true)
    expect(isUpstreamAiError(retryError)).toBe(true)
  })

  it('does NOT treat our own errors as upstream (they must still 500)', () => {
    expect(isUpstreamAiError(new Error('some bug in our route'))).toBe(false)
    expect(isUpstreamAiError(new TypeError("Cannot read properties of undefined (reading 'x')"))).toBe(
      false,
    )
    // A missing/blank API key is OUR misconfig, not the provider's fault —
    // "try again shortly" would be a lie, so it stays a 500.
    const loadKeyError = Object.assign(new Error('API key is missing'), {
      name: 'AI_LoadAPIKeyError',
    })
    expect(isUpstreamAiError(loadKeyError)).toBe(false)
  })

  it('is safe on non-error values', () => {
    expect(isUpstreamAiError(null)).toBe(false)
    expect(isUpstreamAiError(undefined)).toBe(false)
    expect(isUpstreamAiError('string')).toBe(false)
    expect(isUpstreamAiError({ name: 'APICallError' })).toBe(true) // duck-typed on name is intentional
  })
})
