import { cache } from 'react'
import { getCrystalOfTheDay as coreGetCrystalOfTheDay } from '@stellaeum/core/crystals/today'

/**
 * React.cache() wrapper over the shared `getCrystalOfTheDay` function.
 *
 * Purpose: request-scoped dedupe on the Next.js server. Multiple Server
 * Components within the same render pass (dashboard + any future sub-
 * component that also needs today's crystal) share a single Supabase round
 * trip and a single auto-collect insert.
 *
 * Why the wrapper lives here and not inside packages/core: React is not a
 * dependency of the shared package — see
 * `.planning/research/CACHE_WRAP_CONVENTION.md`. Web-specific caching
 * lives at web call sites.
 *
 * Route handlers should NOT import this wrapper — they are not inside a
 * React render pass, so the cache has no effect. They should import the
 * unwrapped function directly from `@stellaeum/core/crystals/today`.
 */
export const getCrystalOfTheDay = cache(coreGetCrystalOfTheDay)
