import { auth } from '@clerk/nextjs/server'
import * as Sentry from '@sentry/nextjs'
import { createServiceSupabaseClient } from '@/lib/supabase/service'
import {
  ensureUserRecord,
  isDeletionPending,
  type AppUser,
} from '@/lib/users/ensure-user'

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
    public readonly code?: string
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

export function toErrorResponse(error: unknown, fallbackMessage: string) {
  if (error instanceof ApiError) {
    return Response.json(
      { error: error.message, code: error.code },
      { status: error.status }
    )
  }

  // A non-ApiError reaching here is an unexpected 500. Because we CATCH it
  // and RETURN a Response (rather than letting it throw), Next's
  // onRequestError / Sentry.captureRequestError never fires — so without
  // this line these 500s are invisible in Sentry and only land in Vercel
  // logs (which have no console-capture integration). See
  // VERIFICATION-SURFACE-GAPS.md #9. Capture explicitly here so the
  // failures most likely to happen (external-service calls in the 6 routes
  // that use this helper) are actually monitored.
  Sentry.captureException(error, { extra: { fallbackMessage } })
  console.error(fallbackMessage, error)
  return Response.json({ error: fallbackMessage }, { status: 500 })
}

export async function requireAppUser(): Promise<{
  userId: string
  user: AppUser
}> {
  const { userId } = await auth()
  if (!userId) {
    throw new ApiError(401, 'Unauthorized')
  }

  return {
    userId,
    user: await ensureUserRecord(userId),
  }
}

export function requirePremium(user: AppUser) {
  if (user.subscription_tier !== 'premium') {
    throw new ApiError(403, 'Premium subscription required.', 'PREMIUM_REQUIRED')
  }
}

export function requireAccountActive(user: AppUser) {
  if (isDeletionPending(user)) {
    throw new ApiError(403, 'Account deletion is pending', 'ACCOUNT_DELETION_PENDING')
  }
}

export async function requireOwnedChart<T extends object>(
  userId: string,
  chartId: string,
  select = '*'
): Promise<T> {
  const supabase = createServiceSupabaseClient()
  const { data: chart, error } = await supabase
    .from('charts')
    .select(select)
    .eq('id', chartId)
    .eq('user_id', userId)
    .single()

  if (error || !chart) {
    throw new ApiError(404, 'Chart not found')
  }

  return chart as unknown as T
}
