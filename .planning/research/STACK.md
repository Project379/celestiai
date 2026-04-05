# Stack Research

**Domain:** Mobile-first astrology/horoscope SaaS with premium subscription (Bulgarian market)
**Project:** Celestia AI - Universal Web + iOS astrology app
**Researched:** 2026-01-19
**Overall Confidence:** HIGH

---

## Executive Summary

This research validates the chosen tech stack for building a universal astrology application with shared codebase across Web and iOS. The stack centers on **Turborepo** for monorepo management, **Solito** for universal navigation between Next.js 15 and Expo SDK 52+, with **swisseph-wasm** running server-side for astronomical calculations. Key findings confirm 90%+ code sharing is achievable with proper architecture.

---

## Recommended Stack

### Core Technologies

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| Turborepo | 2.x | Monorepo orchestration | Rust-rewritten core (2024+), excellent caching, parallel task execution. Industry standard for Next.js + Expo monorepos. [Confidence: HIGH] |
| Solito | 5.x | Universal navigation | Web-first since v5 (Oct 2025), drops react-native-web from core, works natively on Next.js. Official React Navigation + Next.js bridge. [Confidence: HIGH] |
| Next.js | 15.x (15.1.8+) | Web application | App Router, Server Actions, Server Components. Excellent for API routes hosting WASM calculations. [Confidence: HIGH] |
| Expo | SDK 53+ | Mobile application | New Architecture enabled by default, automatic monorepo Metro detection since SDK 52. React Native 0.77+. [Confidence: HIGH] |
| Clerk | @clerk/clerk-expo 2.2.0+ | Universal authentication | Native Expo module, biometric support via useLocalCredentials(), JWT templates for Supabase. Web cookies + mobile tokens unified. [Confidence: HIGH] |
| Supabase | 2.x (@supabase/supabase-js) | PostgreSQL + Realtime | Native Clerk integration (April 2025+), RLS with third-party auth. [Confidence: HIGH] |
| Drizzle ORM | 0.35.x+ | TypeScript ORM | Type-safe, serverless-ready (~7.4kb), excellent Supabase integration, migrations via drizzle-kit. [Confidence: HIGH] |
| NativeWind | 4.2.0+ | Universal styling | Tailwind CSS for React Native. Build-time className to StyleSheet conversion. Works with Solito via styled() HOC. [Confidence: HIGH] |
| React Native Skia | 1.x (@shopify/react-native-skia) | Mobile chart rendering | High-performance 2D graphics, GPU-accelerated. Up to 200% faster animations on Android. [Confidence: HIGH] |
| swisseph-wasm | 0.0.2+ | Astrology calculations | Swiss Ephemeris in WebAssembly. Zero dependencies, browser + Node.js. [Confidence: MEDIUM - limited docs] |

### Supporting Libraries

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| react-native-reanimated | 3.16.7+ (or 4.2.x) | Animations | Required for NativeWind, Skia animations. Auto-included in Expo templates. |
| react-native-gesture-handler | 2.22.0+ | Touch gestures | Required for React Navigation, interactive charts. |
| D3.js | 7.x | Web chart rendering | Web-only canvas/SVG charts. Use with "use client" directive in Next.js. |
| postgres (postgres-js) | 3.x | PostgreSQL driver | Drizzle ORM connection to Supabase. |
| expo-secure-store | latest | Secure token storage | Required for Clerk biometric auth. |
| expo-local-authentication | latest | Biometrics | Face ID / Touch ID for returning users. |
| react-native-purchases | 8.x | RevenueCat SDK | iOS/Android IAP, syncs with Stripe web purchases. |
| @stripe/stripe-react-native | 0.38.x+ | Stripe mobile | Direct Stripe integration if needed beyond RevenueCat. |
| zod | 3.x | Schema validation | API request/response validation, shared between platforms. |

### Development Tools

| Tool | Purpose | Notes |
|------|---------|-------|
| pnpm | Package manager | Faster installs via global store cache, excellent monorepo support with workspaces. |
| drizzle-kit | Database migrations | `npx drizzle-kit generate` for migrations, `npx drizzle-kit studio` for visual DB explorer. |
| Expo Dev Client | Development builds | Required for native modules (Skia, Clerk native module). |
| TypeScript | Type safety | Project references for incremental builds, shared tsconfig.base.json. |
| ESLint + Prettier | Code quality | Root-level config shared across all apps/packages. |

---

## Installation

### Root Monorepo Setup

```bash
# Initialize Turborepo with pnpm
npx create-turbo@latest celestia-ai --package-manager pnpm

# Or use Solito template directly
npx create-solito-app@latest celestia-ai -t with-tailwind
```

### Core Dependencies (apps/web - Next.js)

```bash
cd apps/web
pnpm add next@15 react@19 react-dom@19
pnpm add @clerk/nextjs @supabase/supabase-js
pnpm add drizzle-orm postgres zod
pnpm add d3 @types/d3
pnpm add -D drizzle-kit typescript @types/node
```

### Core Dependencies (apps/mobile - Expo)

```bash
cd apps/mobile
npx expo install expo-router expo-secure-store expo-local-authentication
npx expo install react-native-reanimated@~3.16.7 react-native-gesture-handler@~2.22.0
npx expo install @shopify/react-native-skia
pnpm add @clerk/clerk-expo solito
pnpm add nativewind@^4.2.0 react-native-css-interop
pnpm add react-native-purchases
pnpm add -D tailwindcss@^3.4.17
```

### Shared Packages

```bash
# packages/db - Drizzle schema
pnpm add drizzle-orm postgres @supabase/supabase-js

# packages/astrology - Swiss Ephemeris
pnpm add swisseph-wasm
```

---

## Architecture Patterns

### Monorepo Structure

```
/
├── apps/
│   ├── web/                    # Next.js 15 app
│   │   ├── app/                # App Router
│   │   │   ├── api/            # API routes (WASM calculations)
│   │   │   │   ├── charts/     # Birth chart calculations
│   │   │   │   └── transits/   # Daily transit calculations
│   │   │   └── (routes)/       # Page routes
│   │   └── next.config.js
│   └── mobile/                 # Expo app
│       ├── app/                # Expo Router (file-based)
│       └── metro.config.js
├── packages/
│   ├── ui/                     # Shared UI components (NativeWind)
│   ├── astrology/              # Swiss Ephemeris wrapper
│   ├── db/                     # Drizzle schema + Supabase client
│   └── types/                  # Shared TypeScript types
├── turbo.json
├── pnpm-workspace.yaml
└── tsconfig.base.json
```

### Server-Side WASM Calculations Pattern

**Rationale:** Swiss Ephemeris WASM is too heavy for mobile bundles. Run calculations server-side via API routes.

```typescript
// apps/web/app/api/charts/calculate/route.ts
import SwissEPH from "swisseph-wasm";

export async function POST(request: Request) {
  const { dateTime, latitude, longitude } = await request.json();

  const swe = await SwissEPH.init();
  await swe.swe_set_ephe_path();

  const julianDay = swe.swe_julday(
    dateTime.year, dateTime.month, dateTime.day,
    dateTime.hour, 1
  );

  // Calculate planetary positions
  const planets = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9]; // Sun through Pluto
  const positions = planets.map(planet => ({
    planet,
    position: swe.swe_calc_ut(julianDay, planet, 0)
  }));

  // Calculate houses (Placidus)
  const houses = swe.swe_houses(julianDay, latitude, longitude, "P");

  return Response.json({ positions, houses });
}
```

### Universal Navigation with Solito

```tsx
// packages/ui/src/navigation/Link.tsx
import { Link as SolitoLink, TextLink } from 'solito/link'
import { useRouter } from 'solito/navigation'

export function ChartLink({ chartId, children }) {
  return (
    <SolitoLink href={`/charts/${chartId}`}>
      {children}
    </SolitoLink>
  );
}

// Client component navigation
'use client'
export function useChartNavigation() {
  const router = useRouter();

  const goToChart = (chartId: string) => {
    router.push(`/charts/${chartId}`);
  };

  return { goToChart };
}
```

### Clerk + Supabase Integration (Native Integration - 2025+)

```typescript
// packages/db/src/supabase-client.ts
// Server-side (Next.js)
import { auth } from '@clerk/nextjs/server'
import { createClient } from '@supabase/supabase-js'

export function createServerSupabaseClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_KEY!,
    {
      async accessToken() {
        return (await auth()).getToken()
      },
    },
  )
}

// Client-side (Expo/Web)
'use client'
import { useSession } from '@clerk/clerk-expo' // or @clerk/nextjs
import { createClient } from '@supabase/supabase-js'

export function createClientSupabaseClient(session) {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_KEY!,
    {
      async accessToken() {
        return session?.getToken() ?? null
      },
    },
  )
}
```

### NativeWind Styling with Solito

```tsx
// packages/ui/src/primitives/Button.tsx
import { styled } from 'nativewind'
import { Pressable, Text } from 'react-native'

const StyledPressable = styled(Pressable)
const StyledText = styled(Text)

export function Button({ children, variant = 'primary', onPress }) {
  const baseClasses = 'px-4 py-2 rounded-lg'
  const variantClasses = {
    primary: 'bg-indigo-600 active:bg-indigo-700',
    secondary: 'bg-gray-200 active:bg-gray-300',
  }

  return (
    <StyledPressable
      className={`${baseClasses} ${variantClasses[variant]}`}
      onPress={onPress}
    >
      <StyledText className="text-white font-semibold text-center">
        {children}
      </StyledText>
    </StyledPressable>
  )
}
```

### Platform-Specific Chart Rendering

```tsx
// packages/ui/src/charts/BirthChart.tsx
import { Platform } from 'react-native'

// Mobile: React Native Skia
const SkiaChart = Platform.select({
  native: () => require('./BirthChart.native').default,
  default: () => require('./BirthChart.web').default,
})()

// BirthChart.native.tsx
import { Canvas, Circle, Path, Group } from "@shopify/react-native-skia";

export default function BirthChartNative({ chartData }) {
  return (
    <Canvas style={{ width: 300, height: 300 }}>
      <Group>
        {/* Zodiac wheel */}
        <Circle cx={150} cy={150} r={140} color="transparent"
                style="stroke" strokeWidth={2} />
        {/* Planet positions */}
        {chartData.positions.map((planet, i) => (
          <Circle key={i} cx={...} cy={...} r={8} color="gold" />
        ))}
      </Group>
    </Canvas>
  );
}

// BirthChart.web.tsx
'use client'
import { useRef, useEffect } from 'react'
import * as d3 from 'd3'

export default function BirthChartWeb({ chartData }) {
  const svgRef = useRef(null);

  useEffect(() => {
    const svg = d3.select(svgRef.current);
    // D3 rendering logic
  }, [chartData]);

  return <svg ref={svgRef} width={300} height={300} />;
}
```

### Payment Integration Pattern

```typescript
// Mobile: RevenueCat
import Purchases from 'react-native-purchases';

export async function initializePurchases(userId: string) {
  await Purchases.configure({
    apiKey: Platform.select({
      ios: process.env.REVENUECAT_IOS_KEY,
      android: process.env.REVENUECAT_ANDROID_KEY,
    }),
    appUserID: userId,
  });
}

export async function purchaseSubscription(packageId: string) {
  const offerings = await Purchases.getOfferings();
  const pkg = offerings.current?.availablePackages.find(
    p => p.identifier === packageId
  );
  if (pkg) {
    const { customerInfo } = await Purchases.purchasePackage(pkg);
    return customerInfo.entitlements.active;
  }
}

// Web: Direct Stripe (synced with RevenueCat)
// RevenueCat Web Billing handles Stripe checkout
// Entitlements automatically sync across platforms
```

---

## Alternatives Considered

| Recommended | Alternative | When to Use Alternative |
|-------------|-------------|-------------------------|
| Solito | Expo Router alone | If web isn't needed or Next.js features aren't required |
| NativeWind | Tamagui | If you need more pre-built components and don't mind larger bundle |
| Drizzle ORM | Prisma | If you prefer schema-first approach; note Prisma has larger binary overhead |
| React Native Skia | react-native-svg | For simpler charts without heavy animation requirements |
| D3.js (web) | Chart.js/Recharts | For standard chart types without custom astrological visualizations |
| swisseph-wasm | astronomia | For simpler astronomical calculations without full ephemeris precision |
| pnpm | npm/yarn | If team prefers familiar tooling; pnpm is faster for monorepos |

---

## What NOT to Use

| Avoid | Why | Use Instead |
|-------|-----|-------------|
| NativeWind v5 (pre-release) | Still in development, breaking changes expected | NativeWind v4.2.0+ with Tailwind v3.4.x |
| Tailwind CSS v4 | Not compatible with NativeWind v4 | Tailwind v3.4.17 |
| Clerk JWT Templates | Deprecated April 2025 for Supabase | Native Supabase integration with accessToken() |
| react-native-reanimated < 3.16.7 | Incompatible with RN 0.77 | react-native-reanimated@~3.16.7+ |
| Remote JS Debugging | Incompatible with Reanimated | Hermes debugger |
| Expo prebuilt components for Clerk | Not supported on native | Custom UI with Clerk hooks |
| swisseph-wasm on client | Too heavy for mobile bundles | Server-side API routes |

---

## Version Compatibility Matrix

| Package A | Compatible With | Notes |
|-----------|-----------------|-------|
| Expo SDK 53+ | React Native 0.77+, New Architecture default | SDK 52 needs experiments.reactCanary: true for React 19 |
| Next.js 15 | React 19, Solito 5 | Check solito.dev/compatibility for updates |
| Solito 5 | Next.js 15, React 19, Expo SDK 52+ | apps/next needs react@latest separately |
| NativeWind 4.2.0+ | Expo SDK 54, Reanimated 4 | Tailwind v3.4.x only |
| @clerk/clerk-expo 2.2.0+ | Expo SDK 52+, biometrics | Requires expo-secure-store, expo-local-authentication |
| react-native-reanimated 3.16.7+ | React Native 0.77 | For SDK 52/53; SDK 54+ may need Reanimated 4 |
| @shopify/react-native-skia | Expo SDK 52+ | Requires dev client build |
| drizzle-orm 0.35+ | postgres-js, Supabase | drizzle-kit 0.31+ for migrations |

---

## Configuration Files

### turbo.json

```json
{
  "$schema": "https://turbo.build/schema.json",
  "globalDependencies": ["**/.env.local.*local"],
  "pipeline": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": [".next/**", "!.next/cache/**", "dist/**"]
    },
    "lint": {},
    "dev": {
      "cache": false,
      "persistent": true
    },
    "typecheck": {
      "dependsOn": ["^typecheck"]
    }
  }
}
```

### apps/mobile/metro.config.js

```javascript
const { getDefaultConfig } = require('expo/metro-config');
const { withNativeWind } = require('nativewind/metro');

const config = getDefaultConfig(__dirname);

module.exports = withNativeWind(config, { input: './global.css' });
```

### apps/mobile/babel.config.js

```javascript
module.exports = function (api) {
  api.cache(true);
  return {
    presets: [
      ["babel-preset-expo", { jsxImportSource: "nativewind" }],
      "nativewind/babel",
    ],
  };
};
```

### apps/web/next.config.js

```javascript
/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: [
    'solito',
    'nativewind',
    'react-native-css-interop',
    '@celestia/ui',
    '@celestia/db',
  ],
  experimental: {
    forceSwcTransforms: true,
  },
};

const { withExpo } = require('@expo/next-adapter');

module.exports = withExpo(nextConfig);
```

### packages/db/drizzle.config.ts

```typescript
import { defineConfig } from "drizzle-kit";

export default defineConfig({
  schema: "./src/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
});
```

---

## Sources

### Context7 Libraries Queried
- `/nandorojo/solito` - Universal navigation, App Router hooks, Link components
- `/websites/expo_dev` - SDK 52+ monorepo configuration, New Architecture
- `/vercel/next.js/v15.1.8` - App Router, Server Actions, API routes
- `/clerk/clerk-docs` - Supabase integration, Expo biometric auth, JWT handling
- `/supabase/supabase-js` - Client initialization, RLS policies, third-party auth
- `/llmstxt/orm_drizzle_team_llms_txt` - PostgreSQL setup, Supabase integration
- `/websites/nativewind_dev` - v4 installation, Expo/Next.js configuration
- `/shopify/react-native-skia` - Canvas rendering, Reanimated integration

### Web Sources
- [Turborepo + React Native + Next.js 2025 Guide](https://medium.com/better-dev-nextjs-react/setting-up-turborepo-with-react-native-and-next-js-the-2025-production-guide-690478ad75af) - Confidence: HIGH
- [Solito 5 Web-First Announcement](https://dev.to/redbar0n/solito-5-is-now-web-first-but-still-unifies-nextjs-and-react-native-2lek) - Confidence: HIGH
- [Solito Compatibility Docs](https://solito.dev/compatibility) - Confidence: HIGH
- [swisseph-wasm GitHub](https://github.com/astroahava/astro-sweph) - Confidence: MEDIUM
- [Clerk Expo Biometric Auth](https://clerk.com/docs/guides/development/local-credentials) - Confidence: HIGH
- [RevenueCat + Stripe Web Billing](https://www.revenuecat.com/blog/engineering/build-a-single-expo-app-with-subscriptions-on-ios-android-and-web-using-revenuecat/) - Confidence: HIGH
- [Drizzle + Supabase Guide](https://orm.drizzle.team/docs/tutorials/drizzle-with-supabase) - Confidence: HIGH
- [NativeWind v4 Installation](https://www.nativewind.dev/docs/getting-started/installation) - Confidence: HIGH
- [Expo SDK 52 Announcement](https://expo.dev/changelog/2025-01-21-react-native-0.77) - Confidence: HIGH

### Official Documentation
- [Next.js 15 Docs](https://nextjs.org/docs) - Confidence: HIGH
- [Expo Docs](https://docs.expo.dev/) - Confidence: HIGH
- [Clerk Expo SDK Reference](https://clerk.com/docs/reference/expo/overview) - Confidence: HIGH
- [Supabase Third-Party Auth](https://supabase.com/docs/guides/auth/third-party/overview) - Confidence: HIGH
- [React Native Skia Docs](https://shopify.github.io/react-native-skia/) - Confidence: HIGH

---

*Stack research for: Celestia AI - Universal Astrology App*
*Researched: 2026-01-19*
