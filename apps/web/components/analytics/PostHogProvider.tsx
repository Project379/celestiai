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

  // One effect, not two. Init (with bootstrap) and the post-init identify/
  // reset transitions used to live in separate effects with the same
  // dependency array — in production that let a signed-in cold load reach
  // the transition effect with the ref not yet reflecting the bootstrap
  // (a remount losing the component-local ref while the module-level
  // didInit survives, or the two effects simply landing in different
  // commits), so identify() re-fired on every load even though bootstrap
  // had already set the right distinct id — a sixth, uninstrumented event
  // alongside the five this app is supposed to send. A single effect
  // removes that ordering hazard entirely, and the transition branch
  // double-checks against posthog.get_distinct_id() (PostHog's own state,
  // not a component ref) before calling identify(), so it stays correct
  // even across a remount.
  //
  // Init is gated on Clerk's isLoaded, not fired on mount, so a
  // signed-in user's very first init can bootstrap directly onto their
  // real Clerk ID — `persistence: 'memory'` means there's no
  // bootstrap.distinctID by default, so an init before auth resolves
  // would mint a throwaway anonymous ID for no reason. Bootstrap alone
  // fully establishes identity for that cold-load case: no identify()
  // call is needed there, it would just re-send $identify for an id
  // that's already current. Signed-out visitors still get a fresh
  // anonymous ID per reload (memory persistence, no cookie) — unchanged
  // and accepted: those events were never aliased onto one person to
  // begin with, so it's distinct-visitor noise, not an alias-limit
  // problem.
  useEffect(() => {
    if (!isLoaded) return

    if (!didInit) {
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
      return
    }

    // Past this point: a real sign-in or sign-out happening later in the
    // same page load, not the cold-load case bootstrap already covers.
    if (isSignedIn && userId) {
      if (posthog.get_distinct_id() === userId) {
        loggedInUserIdRef.current = userId
        return
      }
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
