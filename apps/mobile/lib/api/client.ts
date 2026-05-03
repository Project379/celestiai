import { useAuth } from '@clerk/expo'
import { useCallback, useRef } from 'react'

const API_BASE = process.env.EXPO_PUBLIC_API_BASE

/**
 * Thrown when an HTTP response is non-2xx. Callers can branch on `status`
 * and inspect `body` for structured error info from the API.
 */
export class ApiError extends Error {
  constructor(
    public status: number,
    public body: unknown,
    message: string,
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

/**
 * React hook returning a fetch wrapper bound to the current Clerk session.
 * Every request is signed with `Authorization: Bearer <token>` from
 * `useAuth().getToken()`. Returns parsed JSON typed as `unknown` — callers
 * must validate with a Zod schema before use.
 *
 * apiFetch reference is permanently stable (empty-deps useCallback). The
 * underlying getToken from @clerk/expo is a new closure every render, but
 * we read it lazily via getTokenRef.current at fetch time. This is the
 * "latest ref pattern" — stable callback identity with always-fresh state.
 * Do NOT add getTokenRef to the useCallback deps to silence
 * exhaustive-deps; it would defeat the stability and reintroduce the
 * render-loop bug fixed in 2.5-fix-1.
 */
export function useApiClient() {
  const { getToken } = useAuth()
  const getTokenRef = useRef(getToken)
  getTokenRef.current = getToken

  const apiFetch = useCallback(async (path: string, init?: RequestInit): Promise<unknown> => {
    if (!API_BASE) {
      throw new Error('Missing EXPO_PUBLIC_API_BASE env var')
    }
    const token = await getTokenRef.current()
    const headers = new Headers(init?.headers)
    if (token) headers.set('Authorization', `Bearer ${token}`)
    if (init?.body) headers.set('Content-Type', 'application/json')

    const res = await fetch(`${API_BASE}${path}`, { ...init, headers })

    if (!res.ok) {
      let body: unknown = null
      try {
        body = await res.json()
      } catch {
        // non-JSON error body — leave body as null
      }
      throw new ApiError(
        res.status,
        body,
        `[api] ${init?.method ?? 'GET'} ${path} → ${res.status}`,
      )
    }

    return res.json()
  }, [])

  return { apiFetch }
}
