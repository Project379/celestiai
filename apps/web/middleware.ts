import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'

const isPublicRoute = createRouteMatcher([
  '/',
  '/auth(.*)',
  '/api/webhooks(.*)',
])

const isProtectedRoute = createRouteMatcher([
  '/dashboard(.*)',
  '/settings(.*)',
  '/chart(.*)',
])

export default clerkMiddleware(
  async (auth, request) => {
    // Protect routes that require authentication
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
