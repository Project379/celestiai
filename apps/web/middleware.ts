import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'

/**
 * Auth model: deny-by-exception via an explicit protected-route matcher.
 *
 * Any page route that requires a signed-in user must be covered by the
 * matcher below. Pricing (/pricing) stays public as marketing. Webhooks
 * (/api/webhooks) use provider signature verification, not Clerk.
 *
 * Backup defense lives in apps/web/app/(protected)/layout.tsx — if the
 * matcher ever drifts, the route-group layout redirects anonymous users
 * to /sign-in before any authenticated chrome renders.
 */
const isProtectedRoute = createRouteMatcher([
  '/dashboard(.*)',
  '/chart(.*)',
  '/birth-data(.*)',
  '/you(.*)',
  '/rhythm(.*)',
  '/rhythm/journal(.*)',
  '/circle(.*)',
  '/subscription(.*)',
  '/subscription/success(.*)',
])

export default clerkMiddleware(
  async (auth, request) => {
    if (isProtectedRoute(request)) {
      await auth.protect()
    }

    // Get the response (Clerk handles CSP nonce automatically)
    const response = NextResponse.next()

    // Add additional security headers (SEC-14, SEC-15, SEC-16)
    response.headers.set('X-Frame-Options', 'DENY')
    response.headers.set('X-Content-Type-Options', 'nosniff')
    response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')
    response.headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains')
    response.headers.set('X-DNS-Prefetch-Control', 'on')
    response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()')

    // STELLAEUM_PLACEHOLDER: BUILD-SHA — was: no build/version marker on
    // any response, so "which deployment answered this request" required
    // dashboard archaeology. VERCEL_GIT_COMMIT_SHA is Vercel's own env var
    // (auto-populated per deployment, no manual config) — read here at
    // REQUEST time, not baked in at build time, so it can't become a
    // turbo build-cache key (see turbo.json globalPassThroughEnv comment).
    // Local dev has no such deployment, hence the fallback. See
    // .planning/PLACEHOLDERS.md.
    response.headers.set('X-Deploy-SHA', process.env.VERCEL_GIT_COMMIT_SHA ?? 'local')

    return response
  },
  {
    contentSecurityPolicy: {
      strict: true,
      directives: {
        'img-src': ["'self'", 'blob:', 'data:', 'https:'],
        'font-src': ["'self'", 'https://fonts.gstatic.com'],
      },
    },
  }
)

export const config = {
  matcher: [
    // Skip Next.js internals and static files
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    // Always run for API routes
    '/(api|trpc)(.*)',
  ],
}
