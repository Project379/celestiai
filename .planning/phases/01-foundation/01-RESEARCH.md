# Phase 1: Foundation - Research

**Researched:** 2026-01-21
**Domain:** Monorepo scaffold, NativeWind theming, security headers, responsive layout
**Confidence:** HIGH

## Summary

Phase 1 establishes the technical foundation for Celestia AI: a Turborepo monorepo with Next.js 15, NativeWind v4 theming using CSS variables for "cosmic glassmorphism", security headers via middleware, and responsive layouts via Tailwind breakpoints.

Key findings confirm:
1. **Turborepo 2.x** with pnpm workspaces is the standard for Next.js + Expo monorepos
2. **NativeWind v4** supports CSS variables for design tokens, enabling dark theme without `dark:` prefix duplication
3. **Next.js 15 middleware** is the recommended approach for security headers (CSP, X-Frame-Options, etc.)
4. **Tailwind's mobile-first breakpoints** provide responsive design with minimal configuration

**Primary recommendation:** Use Turborepo's `create-turbo` with pnpm, configure NativeWind CSS variables for cosmic theme tokens, implement all security headers in a single middleware file.

---

## Standard Stack

The established libraries/tools for Phase 1:

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Turborepo | 2.x | Monorepo orchestration | Rust-rewritten, fast caching, official Vercel template support |
| Next.js | 15.x | Web application | App Router, Server Components, middleware for headers |
| pnpm | 9.x | Package manager | Fastest for monorepos, workspace isolation, disk-efficient |
| NativeWind | 4.2.0+ | Universal styling | Tailwind for React Native, CSS variables for theming |
| Tailwind CSS | 3.4.x | CSS framework | NativeWind v4 requires Tailwind v3 (not v4) |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| react-native-css-interop | latest | NativeWind dependency | Required for web transpilation |
| typescript | 5.x | Type safety | All packages need consistent TS version |
| postcss | 8.x | CSS processing | Required by Tailwind |
| autoprefixer | 10.x | CSS vendor prefixes | Standard Tailwind setup |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| pnpm | yarn/npm | pnpm is faster and more disk-efficient for monorepos |
| NativeWind v4 | Tamagui | Tamagui is larger bundle, more components; NativeWind is lighter |
| Tailwind v3 | Tailwind v4 | NativeWind v4 requires Tailwind v3; v4 not yet compatible |

**Installation:**

```bash
# Create monorepo with Turborepo
pnpm dlx create-turbo@latest celestia-ai

# Root devDependencies
pnpm add -Dw turbo typescript @types/node

# apps/web dependencies
cd apps/web
pnpm add next@15 react@19 react-dom@19
pnpm add nativewind react-native-css-interop
pnpm add -D tailwindcss@^3.4.17 postcss autoprefixer
```

---

## Architecture Patterns

### Recommended Project Structure

```
celestia-ai/
├── apps/
│   └── web/                          # Next.js 15 app
│       ├── app/
│       │   ├── layout.tsx            # Root layout with theme
│       │   ├── page.tsx              # Landing page
│       │   └── globals.css           # Tailwind + CSS variables
│       ├── middleware.ts             # Security headers
│       ├── next.config.js
│       ├── tailwind.config.ts
│       ├── postcss.config.js
│       └── package.json
├── packages/
│   ├── ui/                           # Shared UI components
│   │   ├── primitives/               # Button, Card, Text, etc.
│   │   ├── tokens/                   # Design token definitions
│   │   ├── tailwind.config.ts        # Shared Tailwind preset
│   │   └── package.json
│   └── config/                       # Shared configs
│       ├── typescript/
│       │   └── base.json
│       └── eslint/
│           └── base.js
├── turbo.json
├── pnpm-workspace.yaml
├── package.json
└── tsconfig.json
```

### Pattern 1: Turborepo Task Configuration

**What:** Define build/dev/lint tasks with proper caching and dependencies.

**When to use:** Always - this is the core Turborepo pattern.

**Example:**

```json
// turbo.json
{
  "$schema": "https://turborepo.dev/schema.json",
  "tasks": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": [".next/**", "!.next/cache/**", "dist/**"]
    },
    "dev": {
      "cache": false,
      "persistent": true
    },
    "lint": {},
    "typecheck": {
      "dependsOn": ["^typecheck"]
    }
  }
}
```

**Source:** [Turborepo Configuration](https://turborepo.dev/docs/reference/configuration)

### Pattern 2: CSS Variables for Theme Tokens

**What:** Define color tokens as CSS custom properties for runtime theme switching.

**When to use:** For dark theme implementation without duplicating every color class.

**Example:**

```css
/* globals.css */
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  :root {
    /* Cosmic Glassmorphism Theme - Light (fallback) */
    --color-background: 15 10 30;      /* Deep space */
    --color-surface: 25 20 50;         /* Elevated surface */
    --color-surface-glass: 40 35 70;   /* Glassmorphism layer */
    --color-primary: 139 92 246;       /* Violet accent */
    --color-secondary: 236 72 153;     /* Pink accent */
    --color-text: 255 255 255;         /* White text */
    --color-text-muted: 156 163 175;   /* Gray-400 */

    /* Glassmorphism tokens */
    --glass-blur: 16px;
    --glass-opacity: 0.15;
    --glass-border: rgba(255, 255, 255, 0.1);
  }

  /* Dark mode uses same values (cosmic theme is inherently dark) */
  .dark {
    --color-background: 15 10 30;
    --color-surface: 25 20 50;
  }
}
```

```typescript
// tailwind.config.ts
import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './app/**/*.{js,ts,jsx,tsx}',
    './components/**/*.{js,ts,jsx,tsx}',
    '../../packages/ui/**/*.{js,ts,jsx,tsx}',
  ],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        background: 'rgb(var(--color-background) / <alpha-value>)',
        surface: 'rgb(var(--color-surface) / <alpha-value>)',
        'surface-glass': 'rgb(var(--color-surface-glass) / <alpha-value>)',
        primary: 'rgb(var(--color-primary) / <alpha-value>)',
        secondary: 'rgb(var(--color-secondary) / <alpha-value>)',
        foreground: 'rgb(var(--color-text) / <alpha-value>)',
        muted: 'rgb(var(--color-text-muted) / <alpha-value>)',
      },
      backdropBlur: {
        glass: 'var(--glass-blur)',
      },
    },
  },
  plugins: [],
}

export default config
```

**Source:** [NativeWind Themes](https://www.nativewind.dev/docs/guides/themes)

### Pattern 3: Security Headers Middleware

**What:** Set all security headers in Next.js middleware for every response.

**When to use:** Always - security headers should apply to all routes.

**Example:**

```typescript
// middleware.ts
import { NextRequest, NextResponse } from 'next/server'

export function middleware(request: NextRequest) {
  const nonce = Buffer.from(crypto.randomUUID()).toString('base64')
  const isDev = process.env.NODE_ENV === 'development'

  // Content Security Policy
  const cspHeader = `
    default-src 'self';
    script-src 'self' 'nonce-${nonce}' 'strict-dynamic' ${isDev ? "'unsafe-eval'" : ''};
    style-src 'self' ${isDev ? "'unsafe-inline'" : `'nonce-${nonce}'`};
    img-src 'self' blob: data: https:;
    font-src 'self' https://fonts.gstatic.com;
    connect-src 'self' ${isDev ? 'ws:' : ''};
    frame-ancestors 'none';
    form-action 'self';
    base-uri 'self';
    object-src 'none';
    upgrade-insecure-requests;
  `.replace(/\s{2,}/g, ' ').trim()

  const requestHeaders = new Headers(request.headers)
  requestHeaders.set('x-nonce', nonce)

  const response = NextResponse.next({
    request: { headers: requestHeaders },
  })

  // Security headers (SEC-13 through SEC-16)
  response.headers.set('Content-Security-Policy', cspHeader)
  response.headers.set('X-Frame-Options', 'DENY')                                    // SEC-14
  response.headers.set('X-Content-Type-Options', 'nosniff')                          // SEC-15
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')         // SEC-16
  response.headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains')

  return response
}

export const config = {
  matcher: [
    {
      source: '/((?!api|_next/static|_next/image|favicon.ico).*)',
      missing: [
        { type: 'header', key: 'next-router-prefetch' },
        { type: 'header', key: 'purpose', value: 'prefetch' },
      ],
    },
  ],
}
```

**Source:** [Next.js CSP Guide](https://nextjs.org/docs/app/guides/content-security-policy)

### Pattern 4: Glassmorphism Component

**What:** Reusable glass-effect card component using Tailwind utilities.

**When to use:** For elevated surfaces in the cosmic theme (UI-01).

**Example:**

```tsx
// packages/ui/primitives/GlassCard.tsx
import { View, type ViewProps } from 'react-native'

interface GlassCardProps extends ViewProps {
  className?: string
  children: React.ReactNode
}

export function GlassCard({ className = '', children, ...props }: GlassCardProps) {
  return (
    <View
      className={`
        bg-surface-glass/15
        backdrop-blur-glass
        border border-white/10
        rounded-2xl
        p-6
        shadow-xl
        ${className}
      `}
      {...props}
    >
      {children}
    </View>
  )
}
```

**Source:** [Glassmorphism with Tailwind](https://flyonui.com/blog/glassmorphism-with-tailwind-css/)

### Anti-Patterns to Avoid

- **Installing React in multiple packages:** Use workspace dependency hoisting, verify with `pnpm why react`
- **Using `darkMode: 'class'` with NativeWind:** Let NativeWind handle dark mode via media queries
- **Setting security headers in `next.config.js` only:** Use middleware for CSP nonces
- **Tailwind v4 with NativeWind v4:** NativeWind v4 requires Tailwind v3.4.x

---

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Monorepo task orchestration | Custom npm scripts | Turborepo | Caching, parallel execution, incremental builds |
| CSS-in-JS for React Native | Custom StyleSheet helpers | NativeWind | Build-time compilation, Tailwind ecosystem |
| Security headers | Manual headers object | Next.js middleware | Nonce generation, route matching |
| Dark mode toggle | Manual theme context | CSS variables + prefers-color-scheme | System preference sync, no JS needed |
| Responsive breakpoints | Custom media queries | Tailwind breakpoints | Mobile-first, consistent across components |

**Key insight:** Phase 1 is all about leveraging established tooling. Every custom solution adds maintenance burden without adding value.

---

## Common Pitfalls

### Pitfall 1: React Version Conflicts

**What goes wrong:** Multiple React versions installed, causing "Invalid hook call" or hydration errors.

**Why it happens:** Turborepo hoists dependencies; different packages may specify different React versions.

**How to avoid:**
1. Pin exact React versions in root `package.json`
2. Use `pnpm why react` to verify single version
3. Remove React from individual package `dependencies` (hoist to root)

**Warning signs:** "Invalid hook call", hydration mismatches, hooks working on one platform but not another.

### Pitfall 2: NativeWind Style Cascade Failures

**What goes wrong:** Text colors applied to View components don't work; dark mode conditionals fail.

**Why it happens:** React Native doesn't cascade styles like CSS web.

**How to avoid:**
```tsx
// WRONG: View doesn't accept text color
<View className="text-white"><Text>Hello</Text></View>

// CORRECT: Apply text styles to Text
<View><Text className="text-foreground">Hello</Text></View>

// WRONG: Dark-only conditional
<Text className="dark:text-white">

// CORRECT: Explicit both modes
<Text className="text-foreground">  // Uses CSS variable
```

**Warning signs:** Styles work on web but not mobile; need server restart to see new styles.

### Pitfall 3: CSP Breaking Hydration

**What goes wrong:** Next.js hydration scripts blocked by CSP, causing blank pages or console errors.

**Why it happens:** Next.js uses inline scripts for hydration; CSP blocks them without nonces.

**How to avoid:**
1. Always include `'nonce-${nonce}'` and `'strict-dynamic'` in `script-src`
2. Use `await connection()` in pages using nonces (dynamic rendering)
3. Allow `'unsafe-eval'` only in development mode

**Warning signs:** Blank page in production, "Refused to execute inline script" console errors.

### Pitfall 4: Missing transpilePackages

**What goes wrong:** "SyntaxError: Cannot use import statement outside a module" in Next.js.

**Why it happens:** NativeWind packages use ES modules that Next.js doesn't transpile by default.

**How to avoid:**

```javascript
// next.config.js
const nextConfig = {
  transpilePackages: ['nativewind', 'react-native-css-interop'],
}
```

**Warning signs:** Module syntax errors at build time.

### Pitfall 5: Security Vulnerability CVE-2025-29927

**What goes wrong:** Middleware authorization bypass via `x-middleware-subrequest` header.

**Why it happens:** Vulnerability in Next.js middleware disclosed March 2025.

**How to avoid:**
1. Ensure Next.js version is 15.2.3+ (patched)
2. If using older version, drop `x-middleware-subrequest` header at proxy/CDN level
3. Don't rely solely on middleware for security; add defense in depth

**Warning signs:** Unexpected access to protected routes.

---

## Code Examples

### Root Layout with Theme (Bulgarian Language)

```tsx
// app/layout.tsx
import './globals.css'
import type { Metadata } from 'next'
import { headers } from 'next/headers'
import { connection } from 'next/server'

export const metadata: Metadata = {
  title: 'Celestia AI - Вашият астрологичен спътник',
  description: 'Персонализирани хороскопи и астрологични прогнози',
}

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  await connection() // Force dynamic rendering for CSP nonce
  const nonce = (await headers()).get('x-nonce') ?? undefined

  return (
    <html lang="bg" className="dark">
      <body
        className="min-h-screen bg-background text-foreground antialiased"
        nonce={nonce}
      >
        {children}
      </body>
    </html>
  )
}
```

### Responsive Grid Layout

```tsx
// Mobile: 1 column, md: 2 columns, lg: 3 columns
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 p-4">
  <GlassCard>
    <h2 className="text-xl font-bold text-foreground">Дневен хороскоп</h2>
    <p className="text-muted">Вашата персонална прогноза</p>
  </GlassCard>
  {/* ... more cards */}
</div>
```

### pnpm-workspace.yaml

```yaml
packages:
  - 'apps/*'
  - 'packages/*'
```

### NativeWind Next.js Config

```javascript
// next.config.js
/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ['nativewind', 'react-native-css-interop'],
  experimental: {
    forceSwcTransforms: true,
  },
}

module.exports = nextConfig
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `pipeline` in turbo.json | `tasks` in turbo.json | Turborepo 2.x (2024) | Breaking config change |
| Tailwind `darkMode: 'class'` | CSS variables + `prefers-color-scheme` | NativeWind v4 (2024) | Simpler theming |
| Security headers in next.config.js | Middleware with nonces | Next.js 13+ (2023) | Better CSP support |
| `.web.tsx` file extensions | `.native.tsx` overrides (web-first) | Solito v5 (2024) | Simpler web bundling |

**Deprecated/outdated:**
- `pipeline` key in turbo.json (use `tasks`)
- NativeWind `styled()` HOC (use JSX transform)
- Tailwind v4 with NativeWind (incompatible)

---

## Open Questions

Things that couldn't be fully resolved:

1. **Bulgarian font support for glassmorphism**
   - What we know: Standard system fonts work; Google Fonts Cyrillic available
   - What's unclear: Optimal font pairing for "cosmic" aesthetic in Cyrillic
   - Recommendation: Start with Inter (has Cyrillic), iterate on typography later

2. **NativeWind v5 migration timing**
   - What we know: v5 is in preview, requires `react-native-css` as peer dependency
   - What's unclear: Stable release date, breaking changes scope
   - Recommendation: Build on v4.2.0+, plan migration in future phase

---

## Sources

### Primary (HIGH confidence)
- [Turborepo Configuration Docs](https://turborepo.dev/docs/reference/configuration) - Task configuration
- [Turborepo Repository Structure](https://turborepo.dev/docs/crafting-your-repository/structuring-a-repository) - Directory layout
- [Next.js CSP Guide](https://nextjs.org/docs/app/guides/content-security-policy) - Security headers
- [NativeWind Installation](https://www.nativewind.dev/docs/getting-started/installation/nextjs) - Next.js setup
- [NativeWind Themes](https://www.nativewind.dev/docs/guides/themes) - CSS variables theming
- [Tailwind Responsive Design](https://tailwindcss.com/docs/responsive-design) - Breakpoint system

### Secondary (MEDIUM confidence)
- [Adding Security Headers to Next.js](https://alvinwanjala.com/blog/adding-security-headers-nextjs/) - Header recommendations
- [Glassmorphism with Tailwind](https://flyonui.com/blog/glassmorphism-with-tailwind-css/) - Glass effect patterns
- [Complete Next.js Security Guide 2025](https://www.turbostarter.dev/blog/complete-nextjs-security-guide-2025-authentication-api-protection-and-best-practices) - Security best practices

### Tertiary (LOW confidence)
- Various Medium articles on monorepo patterns (validated with official docs)

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - Official Turborepo/Next.js/NativeWind documentation
- Architecture patterns: HIGH - Verified with official guides
- Security headers: HIGH - Next.js official CSP documentation
- Glassmorphism: MEDIUM - Community patterns, visual design subjective

**Research date:** 2026-01-21
**Valid until:** 2026-02-21 (30 days - stable technologies)

---

## Requirements Mapping

| Requirement | How Research Addresses It |
|-------------|--------------------------|
| UI-01: Cosmic glassmorphism | CSS variables for theme tokens, glassmorphism component pattern |
| UI-02: Bulgarian text | `lang="bg"` in root layout, all strings in Bulgarian |
| UI-03: Responsive design | Tailwind mobile-first breakpoints |
| SEC-01: HTTPS | Middleware sets `upgrade-insecure-requests` in CSP |
| SEC-13: CSP | Middleware with nonce generation |
| SEC-14: X-Frame-Options | `DENY` header in middleware |
| SEC-15: X-Content-Type-Options | `nosniff` header in middleware |
| SEC-16: Referrer-Policy | `strict-origin-when-cross-origin` in middleware |
