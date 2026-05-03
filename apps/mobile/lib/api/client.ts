import { useAuth } from '@clerk/expo'
import { useCallback } from 'react'

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
 * `useAuth().getToken()`. Memoized on the token getter so dependent hooks
 * re-fetch only on auth-state change. Returns parsed JSON typed as
 * `unknown` — callers must validate with a Zod schema before use.
 */
export function useApiClient() {
  const { getToken } = useAuth()

  const apiFetch = useCallback(async (path: string, init?: RequestInit): Promise<unknown> => {
    if (!API_BASE) {
      throw new Error('Missing EXPO_PUBLIC_API_BASE env var')
    }
    const token = await getToken()
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
  }, [getToken])

  return { apiFetch }
}
