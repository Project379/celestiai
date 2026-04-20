import { createCoreSupabaseClient } from '../lib/supabase'
import { getSubscriptionTier } from '../subscription/tier'
import {
  collectRecommendation,
  type CrystalRecommendationRow,
  type UserCrystalRow,
} from './queries'

export type CollectRecommendationResult =
  | {
      ok: true
      data: {
        userCrystal: UserCrystalRow
        recommendation: CrystalRecommendationRow
      }
    }
  | { ok: false; error: 'PREMIUM_REQUIRED' | 'NOT_FOUND' | 'INTERNAL' }

/**
 * Core function: claim an active recommendation for the user.
 *
 * Premium-gated. Idempotent — collecting the same recommendation twice is
 * a no-op (second call hits the `collected_at IS NULL` filter in
 * collectRecommendation and returns null → NOT_FOUND). Identical behavior
 * to apps/web/app/api/crystals/collect/route.ts at commit 6422810.
 */
export async function collectCrystalRecommendation(
  userId: string,
  recommendationId: string,
): Promise<CollectRecommendationResult> {
  try {
    const tier = await getSubscriptionTier(userId)
    if (tier !== 'premium') {
      return { ok: false, error: 'PREMIUM_REQUIRED' }
    }

    const supabase = createCoreSupabaseClient()
    const result = await collectRecommendation(
      supabase,
      userId,
      recommendationId,
    )
    if (!result) {
      return { ok: false, error: 'NOT_FOUND' }
    }
    return { ok: true, data: result }
  } catch (err) {
    console.error('[core/crystals/collect] error:', err)
    return { ok: false, error: 'INTERNAL' }
  }
}
