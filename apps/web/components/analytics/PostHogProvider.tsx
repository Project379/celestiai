'use client'

import { useEffect, useRef } from 'react'
import { useAuth } from '@clerk/nextjs'
import posthog from 'posthog-js'

/**
 * PostHog, cookieless — the whole reason this is shippable without a
 * cookie-consent banner (COOKIE-CONSENT, .planning/PLACEHOLDERS.md).
 * `persistence: 'memory'` means posthog-js never touches localStorage,
 * sessionStorage, or a cookie: nothing survives a reload, nothing is
 * shared cross-tab, nothing is a cookie. Do not change `persistence`
 * without re-closing COOKIE-CONSENT.
 *
 * Everything else here is turned OFF that isn't one of the five events
 * this app instruments (see PLACEHOLDERS.md / SYSTEM-MAP §12): no
 * autocapture, no pageview/pageleave capture, no session replay, no
 * heatmaps, no surveys, no product tours, no conversations, and
 * `advanced_disable_flags` kills the /flags request entirely — no
 * feature flags, no experiments, no remote-config-driven anything.
 *
 * `before_send` strips the query string from every URL-shaped property
 * PostHog attaches to a capture() call ($current_url, $pathname, etc.)
 * — not just pageviews. Without this, a capture fired from
 * /subscription/success?session_id=cs_... would ship the live Stripe
 * checkout session id as an event property.
 */

const POSTHOG_KEY = process.env.NEXT_PUBLIC_POSTHOG_KEY
const POSTHOG_HOST = process.env.NEXT_PUBLIC_POSTHOG_HOST

const URL_SHAPED_PROPERTIES = [
  '$current_url',
  '$pathname',
  '$referrer',
  '$session_entry_url',
  '$initial_current_url',
  '$initial_pathname',
] as const

function withoutQuery(value: unknown): unknown {
  if (typeof value !== 'string') return value
  try {
    const url = new URL(value)
    return `${url.origin}${url.pathname}`
  } catch {
    // Not a full URL (e.g. a bare pathname) — nothing to strip.
    return value
  }
}

let didInit = false

export function PostHogProvider({ children }: { children: React.ReactNode }) {
  const { isLoaded, isSignedIn, userId } = useAuth()
  const loggedInUserIdRef = useRef<string | null>(null)

  // Init is deliberately gated on Clerk's isLoaded, not fired on mount.
  // `persistence: 'memory'` means there is no bootstrap.distinctID by
  // default, so an init before auth resolves would mint a random
  // anonymous ID and then immediately identify() it away — repeated on
  // every reload, that merge chain is exactly what PostHog's "too many
  // distinct IDs for this person" warning flags. Waiting the few ms for
  // isLoaded lets a signed-in user bootstrap directly on their real
  // Clerk ID instead, so no anonymous ID is ever created or merged for
  // them. Signed-out visitors still get a fresh anonymous ID per reload
  // (memory persistence, no cookie) — that's unchanged and accepted:
  // their events were never aliased onto a single person to begin with,
  // so it's inflated distinct-visitor noise, not the alias-limit failure
  // mode this gating fixes.
  useEffect(() => {
    if (didInit || !isLoaded) return

    if (!POSTHOG_KEY || !POSTHOG_HOST) {
      console.error(
        '[PostHog] Missing NEXT_PUBLIC_POSTHOG_KEY / NEXT_PUBLIC_POSTHOG_HOST — analytics disabled.',
      )
      return
    }

    didInit = true
    posthog.init(POSTHOG_KEY, {
      api_host: POSTHOG_HOST,
      persistence: 'memory',
      person_profiles: 'identified_only',
      autocapture: false,
      capture_pageview: false,
      capture_pageleave: false,
      disable_session_recording: true,
      disable_surveys: true,
      disable_product_tours: true,
      disable_conversations: true,
      enable_heatmaps: false,
      advanced_disable_flags: true,
      bootstrap:
        isSignedIn && userId ? { distinctID: userId, isIdentifiedID: true } : undefined,
      before_send: (capture) => {
        if (!capture) return capture
        const properties = { ...capture.properties }
        for (const key of URL_SHAPED_PROPERTIES) {
          if (key in properties) {
            properties[key] = withoutQuery(properties[key])
          }
        }
        return { ...capture, properties }
      },
    })
    if (isSignedIn && userId) {
      loggedInUserIdRef.current = userId
    }
  }, [isLoaded, isSignedIn, userId])

  // Identity transitions AFTER init — a sign-in or sign-out that happens
  // later in the same session. Mirrors
  // apps/mobile/lib/purchases/RevenueCatProvider.tsx's pattern: watch
  // Clerk's reactive auth state rather than hooking a specific
  // sign-in/out call site, and guard reset() with a ref so it only fires
  // on a real sign-out (never on the cold anonymous load handled above).
  // A no-op immediately after the init effect above, since that effect
  // already set loggedInUserIdRef.current for a signed-in bootstrap.
  useEffect(() => {
    if (!isLoaded || !didInit) return

    if (isSignedIn && userId) {
      if (loggedInUserIdRef.current === userId) return
      posthog.identify(userId)
      loggedInUserIdRef.current = userId
      return
    }

    if (loggedInUserIdRef.current !== null) {
      posthog.reset()
      loggedInUserIdRef.current = null
    }
  }, [isLoaded, isSignedIn, userId])

  return <>{children}</>
}
