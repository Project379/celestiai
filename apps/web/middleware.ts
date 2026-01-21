import { NextRequest, NextResponse } from 'next/server'

export function middleware(request: NextRequest) {
  // Generate nonce for CSP
  const nonce = Buffer.from(crypto.randomUUID()).toString('base64')
  const isDev = process.env.NODE_ENV === 'development'

  // Content Security Policy (SEC-13)
  // Note: CSP frame-ancestors replaces X-Frame-Options in modern browsers
  const cspDirectives = [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic' ${isDev ? "'unsafe-eval'" : ''}`,
    `style-src 'self' ${isDev ? "'unsafe-inline'" : `'nonce-${nonce}'`}`,
    "img-src 'self' blob: data: https:",
    "font-src 'self' https://fonts.gstatic.com",
    `connect-src 'self' ${isDev ? 'ws: wss:' : ''}`,
    "frame-ancestors 'none'",
    "form-action 'self'",
    "base-uri 'self'",
    "object-src 'none'",
    "upgrade-insecure-requests",
  ]

  const cspHeader = cspDirectives.join('; ')

  // Pass nonce to request headers for use in layout
  const requestHeaders = new Headers(request.headers)
  requestHeaders.set('x-nonce', nonce)

  const response = NextResponse.next({
    request: { headers: requestHeaders },
  })

  // Set security headers
  response.headers.set('Content-Security-Policy', cspHeader)           // SEC-13
  response.headers.set('X-Frame-Options', 'DENY')                       // SEC-14
  response.headers.set('X-Content-Type-Options', 'nosniff')             // SEC-15
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')  // SEC-16

  // Additional security headers
  response.headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains')  // SEC-01 (HTTPS)
  response.headers.set('X-DNS-Prefetch-Control', 'on')
  response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()')

  return response
}

// Match all routes except static files and API routes that need different handling
export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - api routes (they may need different CSP)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder files
     */
    {
      source: '/((?!api|_next/static|_next/image|favicon.ico|.*\\..*$).*)',
      missing: [
        { type: 'header', key: 'next-router-prefetch' },
        { type: 'header', key: 'purpose', value: 'prefetch' },
      ],
    },
  ],
}
