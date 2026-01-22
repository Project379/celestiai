# Phase 2: Authentication - Research

**Researched:** 2026-01-22
**Domain:** Clerk authentication with Next.js 15 App Router
**Confidence:** HIGH

## Summary

Clerk provides a mature, well-documented authentication solution for Next.js 15 App Router with first-class support for server components, middleware-based route protection, and built-in CSP nonce handling. The integration is straightforward with `@clerk/nextjs` v6.x, which requires the new `clerkMiddleware()` API (the older `authMiddleware()` is deprecated).

Key findings:
- Bulgarian localization (bg-BG) is officially supported via `@clerk/localizations`
- Clerk v6.36.8+ includes built-in strict CSP support with automatic nonce generation
- The existing Phase 1 middleware will need to be replaced with `clerkMiddleware()` which handles both auth and CSP
- Supabase integration uses a new third-party auth pattern (JWT templates deprecated April 2025)
- Session duration is configurable in Clerk Dashboard (7-day default, customizable lifetime)

**Primary recommendation:** Use `clerkMiddleware()` with built-in `contentSecurityPolicy: { strict: true }` to handle both authentication and CSP in a single middleware, replacing the custom CSP middleware from Phase 1.

## Standard Stack

The established libraries/tools for Clerk + Next.js 15 authentication:

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| @clerk/nextjs | ^6.36.8 | Clerk SDK for Next.js | Official SDK with App Router support |
| @clerk/localizations | ^6.x | Localization strings | Official package with bg-BG Bulgarian support |
| @clerk/themes | ^2.x | Prebuilt themes | Official dark theme and customization |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| svix | ^1.x | Webhook verification | When setting up Clerk webhooks (Phase 3) |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Clerk prebuilt components | Clerk Elements | Elements is deprecated/unmaintained - avoid |
| Clerk hosted pages | Custom pages with `<SignIn />` | Custom pages allow full theming control |

**Installation:**
```bash
pnpm add @clerk/nextjs @clerk/localizations @clerk/themes
```

## Architecture Patterns

### Recommended Project Structure
```
apps/web/
├── middleware.ts              # clerkMiddleware with CSP + route protection
├── app/
│   ├── layout.tsx             # ClerkProvider with Bulgarian localization
│   ├── (auth)/                # Auth route group (public)
│   │   └── auth/
│   │       └── [[...auth]]/
│   │           └── page.tsx   # Combined sign-in/sign-up page
│   ├── (protected)/           # Protected route group
│   │   ├── layout.tsx         # Auth check wrapper
│   │   └── dashboard/
│   │       └── page.tsx
│   └── api/
│       └── [...]/route.ts     # API routes with auth.protect()
├── components/
│   └── auth/
│       ├── AuthHeader.tsx     # Logo + tagline for auth pages
│       └── UserMenu.tsx       # UserButton wrapper with logout confirmation
└── lib/
    └── clerk.ts               # Clerk configuration constants
```

### Pattern 1: Combined Sign-In/Sign-Up Page
**What:** Single `/auth` route with tabs for sign-in and sign-up using Clerk's `<SignIn />` component with `signInOrUpMode` prop
**When to use:** Per CONTEXT.md decision for combined auth experience
**Example:**
```typescript
// Source: https://clerk.com/docs/nextjs/guides/development/custom-sign-in-or-up-page
// app/(auth)/auth/[[...auth]]/page.tsx
import { SignIn } from '@clerk/nextjs'

export default function AuthPage() {
  return (
    <div className="auth-container">
      {/* Cosmic background + Celestia logo */}
      <SignIn
        signInOrUpMode="signInOrUp"
        appearance={{
          variables: {
            colorPrimary: '#8B5CF6', // cosmic purple
            colorBackground: 'rgba(15, 23, 42, 0.8)', // glassmorphism
          }
        }}
      />
    </div>
  )
}
```

### Pattern 2: Middleware with Built-in CSP
**What:** Single middleware handling both authentication and strict CSP
**When to use:** Always - replaces Phase 1 custom CSP middleware
**Example:**
```typescript
// Source: https://clerk.com/docs/guides/secure/best-practices/csp-headers
// middleware.ts
import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server'

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
  },
  {
    contentSecurityPolicy: {
      strict: true,
      // Custom directives merged with Clerk defaults
      directives: {
        'img-src': "'self' blob: data: https:",
        'font-src': "'self' https://fonts.gstatic.com",
      }
    },
  }
)

export const config = {
  matcher: [
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    '/(api|trpc)(.*)',
  ],
}
```

### Pattern 3: ClerkProvider with Bulgarian Localization
**What:** Root layout with Clerk provider configured for Bulgarian and dynamic CSP
**When to use:** In root layout.tsx
**Example:**
```typescript
// Source: https://clerk.com/docs/customization/localization
// app/layout.tsx
import { ClerkProvider } from '@clerk/nextjs'
import { bgBG } from '@clerk/localizations'
import { dark } from '@clerk/themes'

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <ClerkProvider
      localization={bgBG}
      dynamic  // Required for strict CSP nonce handling
      appearance={{
        baseTheme: dark,
        variables: {
          colorPrimary: '#8B5CF6',
          colorBackground: 'rgba(15, 23, 42, 0.95)',
          colorInputBackground: 'rgba(30, 41, 59, 0.8)',
          colorInputText: '#E2E8F0',
          borderRadius: '0.75rem',
          fontFamily: 'inherit',
        },
      }}
    >
      <html lang="bg" className="dark">
        <body>{children}</body>
      </html>
    </ClerkProvider>
  )
}
```

### Pattern 4: API Route Protection
**What:** Protecting API routes with `auth.protect()`
**When to use:** All API routes that require authentication (SEC-17)
**Example:**
```typescript
// Source: https://clerk.com/docs/references/nextjs/auth
// app/api/user/route.ts
import { auth } from '@clerk/nextjs/server'

export async function GET() {
  // Returns 404 for unauthenticated requests
  await auth.protect()

  const { userId } = await auth()

  return Response.json({ userId })
}
```

### Pattern 5: Protected Page with Teaser
**What:** Show teaser content with sign-in CTA for unauthenticated users
**When to use:** Per CONTEXT.md decision for protected route UX
**Example:**
```typescript
// Source: https://clerk.com/docs/references/nextjs/read-session-data
// app/(protected)/chart/page.tsx
import { auth } from '@clerk/nextjs/server'
import { SignInButton } from '@clerk/nextjs'

export default async function ChartPage() {
  const { userId } = await auth()

  if (!userId) {
    return (
      <div className="relative">
        {/* Blurred teaser content */}
        <div className="blur-sm pointer-events-none">
          <ChartPreview />
        </div>
        {/* Overlay CTA */}
        <div className="absolute inset-0 flex items-center justify-center bg-black/50">
          <div className="text-center">
            <p className="text-white mb-4">Влезте, за да видите вашата карта</p>
            <SignInButton mode="modal">
              <button className="btn-primary">Вход</button>
            </SignInButton>
          </div>
        </div>
      </div>
    )
  }

  return <ChartContent userId={userId} />
}
```

### Anti-Patterns to Avoid
- **Using `authMiddleware()`:** Deprecated in v6, use `clerkMiddleware()` instead
- **Protecting all routes by default:** `clerkMiddleware()` makes all routes public by default - explicitly protect routes
- **Using Clerk Elements:** Deprecated and unmaintained, use appearance prop for customization
- **Manual nonce handling with Clerk CSP:** When using `contentSecurityPolicy: { strict: true }`, Clerk handles nonces automatically
- **Synchronous `clerkClient`:** Must use `await clerkClient()` in v6

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Session management | Custom JWT/cookie handling | Clerk's built-in session | Clerk handles HttpOnly, Secure, SameSite cookies automatically (SEC-12) |
| Rate limiting | Custom rate limiter | Clerk built-in | Rate limiting on sign-in/verification is automatic (SEC-09, SEC-10) |
| Email verification flow | Custom email sending | Clerk Dashboard config | Clerk handles verification emails, resend logic, and error states |
| Password reset | Custom reset flow | Clerk `<SignIn />` | Forgot password flow is built into SignIn component |
| CSP nonce generation | Manual nonce middleware | `contentSecurityPolicy: { strict: true }` | Clerk middleware handles nonce generation and header injection |
| Localization strings | Manual translation files | `@clerk/localizations` | Bulgarian (bg-BG) already translated |
| User avatar/menu | Custom dropdown | `<UserButton />` | Pre-built with sign-out, account management |

**Key insight:** Clerk v6 handles nearly all auth complexity. The main customization needed is theming via `appearance` prop, not custom logic.

## Common Pitfalls

### Pitfall 1: Forgetting `dynamic` prop with strict CSP
**What goes wrong:** CSP nonce mismatch errors, scripts blocked
**Why it happens:** Strict CSP requires server-generated nonces on each request, which needs dynamic rendering
**How to avoid:** Always add `dynamic` prop to `<ClerkProvider>` when using strict CSP
**Warning signs:** Browser console showing CSP violations, Clerk components not loading

### Pitfall 2: Using old `authMiddleware()` API
**What goes wrong:** Deprecated API warnings, unexpected behavior
**Why it happens:** Many tutorials/examples still show old API
**How to avoid:** Use `clerkMiddleware()` with explicit route protection via `createRouteMatcher()`
**Warning signs:** Console deprecation warnings

### Pitfall 3: Protecting sign-in routes
**What goes wrong:** Redirect loops, unable to sign in
**Why it happens:** Middleware protects `/auth` route, redirects to sign-in, which redirects again
**How to avoid:** Always include auth routes in `isPublicRoute` matcher
**Warning signs:** Infinite redirects, browser error "too many redirects"

### Pitfall 4: Missing environment variables
**What goes wrong:** Clerk components show error, auth doesn't work
**Why it happens:** Forgot to set `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` or `CLERK_SECRET_KEY`
**How to avoid:** Check `.env.local` has both keys from Clerk Dashboard
**Warning signs:** "Missing Clerk publishable key" error

### Pitfall 5: Not awaiting `auth()` in App Router
**What goes wrong:** TypeScript errors, undefined values
**Why it happens:** In Next.js 15 App Router, `auth()` is async
**How to avoid:** Always use `const { userId } = await auth()`
**Warning signs:** TypeScript "Promise" type errors

### Pitfall 6: CVE-2025-29927 vulnerability
**What goes wrong:** Complete bypass of middleware security
**Why it happens:** Next.js 11.1.4 through 15.2.2 have critical middleware bypass vulnerability
**How to avoid:** Ensure Next.js is 15.2.3+ (current project uses 15.2.4, which is safe)
**Warning signs:** None - silent bypass. Must verify version.

## Code Examples

Verified patterns from official sources:

### Environment Variables
```bash
# Source: https://clerk.com/docs/nextjs/getting-started/quickstart
# .env.local

# From Clerk Dashboard > API Keys
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...

# Custom auth URLs
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/auth
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/auth
NEXT_PUBLIC_CLERK_SIGN_IN_FALLBACK_REDIRECT_URL=/dashboard
NEXT_PUBLIC_CLERK_SIGN_UP_FALLBACK_REDIRECT_URL=/dashboard
```

### Client-Side Auth Check
```typescript
// Source: https://clerk.com/docs/nextjs/reference/hooks/use-auth
'use client'
import { useAuth } from '@clerk/nextjs'

export function AuthStatus() {
  const { isLoaded, isSignedIn, userId } = useAuth()

  if (!isLoaded) {
    return <CosmicSpinner /> // Loading state per CONTEXT.md
  }

  if (!isSignedIn) {
    return <SignInPrompt />
  }

  return <UserDashboard userId={userId} />
}
```

### User Menu with Sign Out
```typescript
// Source: https://clerk.com/docs/nextjs/reference/components/user/user-button
'use client'
import { UserButton } from '@clerk/nextjs'

export function UserMenu() {
  return (
    <UserButton
      afterSignOutUrl="/"
      appearance={{
        elements: {
          avatarBox: 'w-10 h-10 ring-2 ring-purple-500/50',
          userButtonPopoverCard: 'bg-slate-900/95 backdrop-blur-xl border border-slate-700',
        }
      }}
    />
  )
}
```

### Supabase Token for RLS (Phase 3 Prep)
```typescript
// Source: https://clerk.com/docs/guides/development/integrations/databases/supabase
// This pattern will be used in Phase 3 for database integration
import { auth } from '@clerk/nextjs/server'

export async function getSupabaseToken() {
  const { getToken } = await auth()
  // Clerk automatically includes role: "authenticated" claim
  // when Supabase integration is enabled in Dashboard
  return await getToken({ template: 'supabase' })
}
```

### Session Expiry Modal Pattern
```typescript
// Source: Clerk hooks + CONTEXT.md requirements
'use client'
import { useAuth } from '@clerk/nextjs'
import { useEffect, useState } from 'react'

export function SessionExpiryModal() {
  const { isLoaded, isSignedIn } = useAuth()
  const [wasSignedIn, setWasSignedIn] = useState(false)
  const [showModal, setShowModal] = useState(false)

  useEffect(() => {
    if (isLoaded && isSignedIn) {
      setWasSignedIn(true)
    }
    if (isLoaded && wasSignedIn && !isSignedIn) {
      // Session expired - show modal instead of redirect
      setShowModal(true)
    }
  }, [isLoaded, isSignedIn, wasSignedIn])

  if (!showModal) return null

  return (
    <div className="modal">
      <p>Сесията ви изтече. Влезте отново, за да продължите.</p>
      <SignInButton mode="modal">
        <button>Вход</button>
      </SignInButton>
    </div>
  )
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `authMiddleware()` | `clerkMiddleware()` | @clerk/nextjs v6 (2024) | Must migrate, all routes public by default |
| JWT templates for Supabase | Third-party auth integration | April 2025 | Configure in Supabase Dashboard, not Clerk JWT templates |
| Manual CSP middleware | `contentSecurityPolicy` option | @clerk/nextjs v6.14.0 | Built-in strict CSP with automatic nonces |
| Clerk Elements (beta) | appearance prop + themes | 2025 | Elements deprecated, use appearance prop |
| `redirectToSignIn()` helper | `auth.protect()` or manual redirect | @clerk/nextjs v6 | protect() handles redirects automatically |

**Deprecated/outdated:**
- `authMiddleware()`: Removed in v6, migrate to `clerkMiddleware()`
- Clerk JWT templates for Supabase: Use new third-party auth integration
- `redirectToSignIn()` / `redirectToSignUp()`: Use `auth.protect()` or `auth().redirectToSignIn()`
- Synchronous `clerkClient`: Must await `await clerkClient()`

## Open Questions

Things that couldn't be fully resolved:

1. **"Remember me" checkbox implementation**
   - What we know: Clerk Dashboard has session lifetime settings (7-day default, configurable)
   - What's unclear: No native "remember me" checkbox feature found - may need custom implementation
   - Recommendation: Configure 30-day lifetime in Dashboard, implement custom "remember me" logic that clears session on browser close if unchecked (using beforeunload)

2. **Logout confirmation dialog**
   - What we know: `<SignOutButton>` has no built-in confirmation, `signOut()` is available via `useClerk()`
   - What's unclear: Best pattern for modal confirmation
   - Recommendation: Wrap signOut in custom dialog component using Radix/Headless UI

3. **Exact Bulgarian translation completeness**
   - What we know: bg-BG is listed in @clerk/localizations changelog
   - What's unclear: Whether all strings are translated or just core ones
   - Recommendation: Test thoroughly, override any missing strings via localization prop

## Sources

### Primary (HIGH confidence)
- [Clerk Next.js Quickstart](https://clerk.com/docs/nextjs/getting-started/quickstart) - Official quickstart
- [clerkMiddleware Reference](https://clerk.com/docs/reference/nextjs/clerk-middleware) - Middleware API
- [Clerk CSP Headers Guide](https://clerk.com/docs/guides/secure/best-practices/csp-headers) - CSP configuration
- [Clerk Localization Docs](https://clerk.com/docs/customization/localization) - Bulgarian support confirmed
- [Clerk + Supabase Integration](https://clerk.com/docs/guides/development/integrations/databases/supabase) - New integration pattern
- [Clerk auth() Reference](https://clerk.com/docs/references/nextjs/auth) - Server-side auth API
- [Clerk Session Options](https://clerk.com/docs/guides/secure/session-options) - Session configuration

### Secondary (MEDIUM confidence)
- [Clerk Authentication in Next.js 15 Guide](https://www.buildwithmatija.com/blog/clerk-authentication-nextjs15-app-router) - Community guide verified with official docs
- [CVE-2025-29927 disclosure](https://clerk.com/articles/complete-authentication-guide-for-nextjs-app-router) - Critical Next.js vulnerability info

### Tertiary (LOW confidence)
- @clerk/localizations Bulgarian completeness - Changelog confirms bg-BG exists but translation coverage untested

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - Official Clerk documentation, verified versions
- Architecture: HIGH - Patterns from official docs and quickstart repo
- Pitfalls: HIGH - Documented in official upgrade guides and security advisories
- Localization: MEDIUM - bg-BG confirmed in changelog, coverage untested

**Research date:** 2026-01-22
**Valid until:** 2026-02-22 (30 days - Clerk SDK is stable)
