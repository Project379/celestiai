# Celestia AI - Universal App Architecture Research

**Research Date:** January 2026
**Domain:** Premium Astrology SaaS (Web + iOS, Bulgarian Market)
**Target Stack:** Turborepo + Solito (Next.js 15 + Expo SDK 52) + Clerk + Supabase + NativeWind v4

---

## System Overview

```
+-----------------------------------------------------------------------------------+
|                              CELESTIA AI ARCHITECTURE                              |
+-----------------------------------------------------------------------------------+
|                                                                                   |
|  +---------------------------------------------------------------------------+   |
|  |                           TURBOREPO MONOREPO                              |   |
|  |                                                                           |   |
|  |  +---------------------------+     +---------------------------+          |   |
|  |  |        apps/web           |     |      apps/mobile          |          |   |
|  |  |      (Next.js 15)         |     |     (Expo SDK 52)         |          |   |
|  |  +---------------------------+     +---------------------------+          |   |
|  |  | - App Router (RSC)        |     | - React Navigation        |          |   |
|  |  | - API Routes (/api/*)     |     | - Expo Router             |          |   |
|  |  | - D3.js + Canvas charts   |     | - RN Skia charts          |          |   |
|  |  | - Stripe Web Checkout     |     | - RevenueCat IAP          |          |   |
|  |  | - SSR/SSG pages           |     | - Native biometrics       |          |   |
|  |  +-------------+-------------+     +-------------+-------------+          |   |
|  |                |                                 |                        |   |
|  |                +----------------+----------------+                        |   |
|  |                                 |                                         |   |
|  |                                 v                                         |   |
|  |  +------------------------------------------------------------------+    |   |
|  |  |                     packages/ (Shared Code)                       |    |   |
|  |  +------------------------------------------------------------------+    |   |
|  |  |                                                                  |    |   |
|  |  |  +---------------+  +---------------+  +---------------------+   |    |   |
|  |  |  | @celestia/app |  | @celestia/db  |  | @celestia/astrology |   |    |   |
|  |  |  +---------------+  +---------------+  +---------------------+   |    |   |
|  |  |  | Screens/UI    |  | Drizzle Schema|  | swisseph-wasm types |   |    |   |
|  |  |  | Navigation    |  | Supabase      |  | Chart calculations  |   |    |   |
|  |  |  | Business logic|  | Client setup  |  | Zodiac utilities    |   |    |   |
|  |  |  | Hooks/Stores  |  | RLS policies  |  | Transit predictions |   |    |   |
|  |  |  +---------------+  +---------------+  +---------------------+   |    |   |
|  |  |                                                                  |    |   |
|  |  |  +---------------+  +---------------+  +---------------------+   |    |   |
|  |  |  | @celestia/ui  |  | @celestia/api |  | @celestia/config    |   |    |   |
|  |  |  +---------------+  +---------------+  +---------------------+   |    |   |
|  |  |  | NativeWind    |  | tRPC/API types|  | tsconfig bases      |   |    |   |
|  |  |  | Design tokens |  | Validators    |  | ESLint configs      |   |    |   |
|  |  |  | Primitives    |  | Zod schemas   |  | Tailwind presets    |   |    |   |
|  |  |  +---------------+  +---------------+  +---------------------+   |    |   |
|  |  +------------------------------------------------------------------+    |   |
|  +---------------------------------------------------------------------------+   |
|                                      |                                           |
|                                      v                                           |
|  +---------------------------------------------------------------------------+   |
|  |                         EXTERNAL SERVICES                                 |   |
|  +---------------------------------------------------------------------------+   |
|  |                                                                           |   |
|  |  +----------------+  +----------------+  +------------------+             |   |
|  |  |     Clerk      |  |    Supabase    |  |  Gemini/GPT-5    |             |   |
|  |  +----------------+  +----------------+  +------------------+             |   |
|  |  | Auth provider  |  | PostgreSQL DB  |  | AI Readings      |             |   |
|  |  | JWT tokens     |  | Realtime       |  | Horoscope gen    |             |   |
|  |  | User mgmt      |  | RLS policies   |  | Journal insights |             |   |
|  |  +----------------+  +----------------+  +------------------+             |   |
|  |                                                                           |   |
|  |  +----------------+  +----------------+  +------------------+             |   |
|  |  | Stripe (Web)   |  | RevenueCat     |  | swisseph-wasm    |             |   |
|  |  +----------------+  +----------------+  +------------------+             |   |
|  |  | Web payments   |  | iOS/Android IAP|  | Server-side only |             |   |
|  |  | Subscriptions  |  | Entitlements   |  | API route hosted |             |   |
|  |  | Webhooks       |  | Cross-platform |  | Ephemeris data   |             |   |
|  |  +----------------+  +----------------+  +------------------+             |   |
|  +---------------------------------------------------------------------------+   |
+-----------------------------------------------------------------------------------+
```

---

## Component Responsibilities

| Component | Responsibility | Platform | Key Technologies |
|-----------|---------------|----------|------------------|
| **apps/web** | Next.js web application with SSR/SSG, API routes for WASM calculations | Web | Next.js 15, App Router, D3.js, Canvas |
| **apps/mobile** | Expo mobile application shell | iOS/Android | Expo SDK 52, React Navigation, RN Skia |
| **@celestia/app** | Shared screens, business logic, navigation patterns | Universal | Solito, React, Zustand, TanStack Query |
| **@celestia/db** | Database schema, Supabase client, migrations | Server/Universal | Drizzle ORM, Supabase, PostgreSQL |
| **@celestia/astrology** | Swiss Ephemeris types, calculation interfaces, zodiac utilities | Universal (types) | TypeScript, Zod |
| **@celestia/ui** | Design system, NativeWind components, primitives | Universal | NativeWind v4, Tailwind CSS |
| **@celestia/api** | Shared API types, validators, tRPC contracts | Universal | tRPC, Zod |
| **@celestia/config** | Shared configs (tsconfig, eslint, tailwind) | Build-time | TypeScript, ESLint |

---

## Recommended Project Structure

```
celestia-ai/
├── apps/
│   ├── web/                              # Next.js 15 app
│   │   ├── app/                          # App Router
│   │   │   ├── (auth)/                   # Auth routes group
│   │   │   │   ├── sign-in/
│   │   │   │   └── sign-up/
│   │   │   ├── (dashboard)/              # Protected routes
│   │   │   │   ├── chart/[id]/
│   │   │   │   ├── daily/
│   │   │   │   ├── journal/
│   │   │   │   └── settings/
│   │   │   ├── api/                      # API Routes
│   │   │   │   ├── astrology/
│   │   │   │   │   ├── calculate/route.ts    # WASM calculations
│   │   │   │   │   ├── transits/route.ts
│   │   │   │   │   └── houses/route.ts
│   │   │   │   ├── webhooks/
│   │   │   │   │   ├── stripe/route.ts
│   │   │   │   │   └── revenuecat/route.ts
│   │   │   │   └── ai/
│   │   │   │       └── reading/route.ts
│   │   │   ├── layout.tsx
│   │   │   └── page.tsx
│   │   ├── components/                   # Web-specific components
│   │   │   └── charts/                   # D3.js chart components
│   │   │       ├── NatalChart.tsx
│   │   │       └── TransitWheel.tsx
│   │   ├── lib/
│   │   │   ├── swisseph.ts              # WASM loader
│   │   │   └── clerk-supabase.ts        # Client factory
│   │   ├── next.config.js
│   │   ├── tailwind.config.ts
│   │   └── package.json
│   │
│   └── mobile/                           # Expo app
│       ├── app/                          # Expo Router (file-based)
│       │   ├── (auth)/
│       │   │   ├── sign-in.tsx
│       │   │   └── sign-up.tsx
│       │   ├── (tabs)/
│       │   │   ├── _layout.tsx
│       │   │   ├── home.tsx
│       │   │   ├── chart.tsx
│       │   │   ├── daily.tsx
│       │   │   └── journal.tsx
│       │   ├── chart/[id].tsx
│       │   ├── _layout.tsx
│       │   └── index.tsx
│       ├── components/                   # Mobile-specific components
│       │   └── charts/                   # RN Skia chart components
│       │       ├── NatalChart.native.tsx
│       │       └── TransitWheel.native.tsx
│       ├── app.json
│       ├── babel.config.js
│       ├── metro.config.js
│       ├── tailwind.config.ts
│       └── package.json
│
├── packages/
│   ├── app/                              # Shared application code
│   │   ├── features/                     # Feature modules
│   │   │   ├── auth/
│   │   │   │   ├── hooks/
│   │   │   │   │   └── useAuth.ts
│   │   │   │   └── screens/
│   │   │   │       ├── SignInScreen.tsx
│   │   │   │       └── SignUpScreen.tsx
│   │   │   ├── chart/
│   │   │   │   ├── hooks/
│   │   │   │   │   ├── useChart.ts
│   │   │   │   │   └── useChartMutations.ts
│   │   │   │   ├── screens/
│   │   │   │   │   ├── ChartDetailScreen.tsx
│   │   │   │   │   └── ChartListScreen.tsx
│   │   │   │   └── components/
│   │   │   │       └── ChartCard.tsx
│   │   │   ├── daily/
│   │   │   │   ├── hooks/
│   │   │   │   │   └── useDailyTransit.ts
│   │   │   │   └── screens/
│   │   │   │       └── DailyScreen.tsx
│   │   │   └── journal/
│   │   │       ├── hooks/
│   │   │       │   └── useJournal.ts
│   │   │       └── screens/
│   │   │           └── JournalScreen.tsx
│   │   ├── navigation/                   # Solito navigation
│   │   │   ├── index.ts
│   │   │   └── types.ts
│   │   ├── stores/                       # Zustand stores
│   │   │   ├── authStore.ts
│   │   │   └── chartStore.ts
│   │   ├── providers/
│   │   │   ├── QueryProvider.tsx
│   │   │   └── index.tsx
│   │   └── package.json
│   │
│   ├── db/                               # Database package
│   │   ├── drizzle/
│   │   │   └── migrations/
│   │   ├── schema/
│   │   │   ├── users.ts
│   │   │   ├── charts.ts
│   │   │   ├── dailyTransits.ts
│   │   │   └── journalEntries.ts
│   │   ├── client.ts                     # Supabase + Drizzle client
│   │   ├── index.ts
│   │   ├── drizzle.config.ts
│   │   └── package.json
│   │
│   ├── astrology/                        # Astrology engine types
│   │   ├── types/
│   │   │   ├── chart.ts
│   │   │   ├── planet.ts
│   │   │   ├── house.ts
│   │   │   └── aspect.ts
│   │   ├── utils/
│   │   │   ├── zodiac.ts
│   │   │   └── degrees.ts
│   │   ├── validators/
│   │   │   └── chartInput.ts
│   │   ├── index.ts
│   │   └── package.json
│   │
│   ├── ui/                               # Design system
│   │   ├── primitives/
│   │   │   ├── Button.tsx
│   │   │   ├── Input.tsx
│   │   │   ├── Card.tsx
│   │   │   └── Text.tsx
│   │   ├── composed/
│   │   │   ├── DateTimePicker/
│   │   │   │   ├── index.tsx            # Default (web)
│   │   │   │   └── index.native.tsx     # Native override
│   │   │   └── LocationPicker/
│   │   │       ├── index.tsx
│   │   │       └── index.native.tsx
│   │   ├── tokens/
│   │   │   ├── colors.ts
│   │   │   └── spacing.ts
│   │   ├── index.ts
│   │   └── package.json
│   │
│   ├── api/                              # Shared API types
│   │   ├── trpc/
│   │   │   └── router.ts
│   │   ├── validators/
│   │   │   └── chart.ts
│   │   ├── index.ts
│   │   └── package.json
│   │
│   └── config/                           # Shared configurations
│       ├── eslint/
│       │   └── base.js
│       ├── typescript/
│       │   ├── base.json
│       │   ├── nextjs.json
│       │   └── react-native.json
│       └── tailwind/
│           └── preset.js
│
├── turbo.json                            # Turborepo config
├── package.json                          # Root package.json
├── pnpm-workspace.yaml                   # Workspace config
└── .env.example
```

### Structure Rationale

| Directory | Rationale | Confidence |
|-----------|-----------|------------|
| `apps/` for shells | Following Turborepo conventions - app shells handle platform-specific routing/navigation while screens are shared. Solito recommends this pattern for "app shells decide routing, screens stay agnostic". | HIGH |
| `packages/app/features/` | Feature-based organization enables better code splitting, lazy loading, and team ownership. Each feature is self-contained with hooks, screens, and components. | HIGH |
| `packages/db/` separate | Database schema as shared package enables type-safe queries from both web API routes and mobile via data layer. Drizzle ORM generates TypeScript types from schema. | HIGH |
| `packages/astrology/` types-only | Keep WASM execution server-side only (API routes). Package contains only TypeScript types and utilities - no WASM bundled. Prevents mobile bundle bloat. | HIGH |
| `packages/ui/` with `.native.tsx` | Solito v5 uses web-first pattern with `.native.tsx` overrides. Default files work on web with zero config; native files provide platform-specific implementations. | HIGH |
| `packages/config/` | Shared configs reduce duplication and ensure consistency across apps. Standard Turborepo pattern. | HIGH |

---

## Architectural Patterns

### 1. Solito v5 Web-First File Convention

Solito v5 (released late 2024) introduced a paradigm shift: **web-first files with `.native.tsx` overrides**.

**Key Insight:** The default file (`index.tsx`) is always web-first. Native platforms use `index.native.tsx`. This simplifies web bundler configuration significantly.

```tsx
// packages/ui/composed/DateTimePicker/index.tsx (WEB - default)
'use client'

import { useState } from 'react'

export function DateTimePicker({ value, onChange }: Props) {
  return (
    <input
      type="datetime-local"
      value={value}
      onChange={(e) => onChange(new Date(e.target.value))}
      className="rounded-lg border border-gray-300 px-4 py-2"
    />
  )
}
```

```tsx
// packages/ui/composed/DateTimePicker/index.native.tsx (NATIVE override)
import { useState } from 'react'
import DateTimePickerNative from '@react-native-community/datetimepicker'
import { View, Pressable, Text } from 'react-native'

export function DateTimePicker({ value, onChange }: Props) {
  const [show, setShow] = useState(false)

  return (
    <View>
      <Pressable onPress={() => setShow(true)} className="rounded-lg border border-gray-300 px-4 py-2">
        <Text>{value.toLocaleString()}</Text>
      </Pressable>
      {show && (
        <DateTimePickerNative
          value={value}
          mode="datetime"
          onChange={(_, date) => {
            setShow(false)
            if (date) onChange(date)
          }}
        />
      )}
    </View>
  )
}
```

**Confidence:** HIGH - This is official Solito v5 documentation pattern.

**Source:** [Solito v5 Upgrade Guide](https://solito.dev/v5)

---

### 2. Universal Navigation with Solito

Solito provides hooks that work identically on web (Next.js) and native (React Navigation/Expo Router):

```tsx
// packages/app/features/chart/screens/ChartDetailScreen.tsx
'use client'

import { View, Text, Pressable } from 'react-native'
import { useParams, useRouter } from 'solito/navigation'
import { SolitoImage } from 'solito/image'
import { TextLink } from 'solito/link'
import { useChart } from '../hooks/useChart'

export function ChartDetailScreen() {
  const router = useRouter()
  const params = useParams<{ id: string }>()
  const { data: chart, isLoading } = useChart(params?.id)

  if (isLoading) return <LoadingSpinner />

  return (
    <View className="flex-1 bg-white p-4">
      {/* Back navigation */}
      <Pressable onPress={() => router.back()} className="mb-4">
        <Text className="text-blue-600">Back</Text>
      </Pressable>

      {/* Chart info */}
      <Text className="text-2xl font-bold">{chart?.name}</Text>
      <Text className="text-gray-600">{chart?.city_name}</Text>

      {/* Link to edit */}
      <TextLink
        href={`/chart/${params?.id}/edit`}
        className="mt-4 text-blue-600 underline"
      >
        Edit Chart
      </TextLink>

      {/* Programmatic navigation */}
      <Pressable
        onPress={() => router.push('/daily')}
        className="mt-4 rounded-lg bg-purple-600 px-6 py-3"
      >
        <Text className="text-center text-white font-semibold">
          View Daily Transit
        </Text>
      </Pressable>
    </View>
  )
}
```

**Confidence:** HIGH - Direct from Solito documentation.

**Source:** [Solito Navigation Documentation](https://solito.dev/)

---

### 3. Server-Side WASM Integration (Swiss Ephemeris)

Heavy WASM calculations must run server-side. The mobile app calls API routes; it never bundles the WASM.

```tsx
// apps/web/lib/swisseph.ts
import SwissEph from 'swisseph-wasm'

let sweInstance: SwissEph | null = null

export async function getSwissEph(): Promise<SwissEph> {
  if (!sweInstance) {
    sweInstance = new SwissEph()
    await sweInstance.initSwissEph()
    // Set ephemeris path for high-precision calculations
    sweInstance.swe_set_ephe_path('./ephemeris')
  }
  return sweInstance
}

export async function calculatePlanetPositions(
  year: number,
  month: number,
  day: number,
  hour: number
): Promise<PlanetPositions> {
  const swe = await getSwissEph()
  const jd = swe.julday(year, month, day, hour)

  const planets = [
    { id: swe.SE_SUN, name: 'Sun' },
    { id: swe.SE_MOON, name: 'Moon' },
    { id: swe.SE_MERCURY, name: 'Mercury' },
    { id: swe.SE_VENUS, name: 'Venus' },
    { id: swe.SE_MARS, name: 'Mars' },
    { id: swe.SE_JUPITER, name: 'Jupiter' },
    { id: swe.SE_SATURN, name: 'Saturn' },
    { id: swe.SE_URANUS, name: 'Uranus' },
    { id: swe.SE_NEPTUNE, name: 'Neptune' },
    { id: swe.SE_PLUTO, name: 'Pluto' },
  ]

  const positions: PlanetPositions = {}

  for (const planet of planets) {
    const result = swe.calc_ut(jd, planet.id, swe.SEFLG_SWIEPH)
    positions[planet.name] = {
      longitude: result[0],
      latitude: result[1],
      distance: result[2],
      speed: result[3],
    }
  }

  return positions
}
```

```tsx
// apps/web/app/api/astrology/calculate/route.ts
import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { calculatePlanetPositions } from '@/lib/swisseph'
import { chartInputSchema } from '@celestia/astrology/validators'

export async function POST(request: Request) {
  const { userId } = await auth()
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json()
  const parsed = chartInputSchema.safeParse(body)

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error }, { status: 400 })
  }

  const { year, month, day, hour, latitude, longitude } = parsed.data

  try {
    const positions = await calculatePlanetPositions(year, month, day, hour)

    return NextResponse.json({
      positions,
      calculatedAt: new Date().toISOString(),
    })
  } catch (error) {
    console.error('Swiss Ephemeris calculation error:', error)
    return NextResponse.json(
      { error: 'Calculation failed' },
      { status: 500 }
    )
  }
}
```

**Confidence:** HIGH - swisseph-wasm GitHub documentation confirms WebAssembly + Node.js pattern.

**Source:** [swisseph-wasm GitHub](https://github.com/prolaxu/swisseph-wasm)

---

### 4. State Management: TanStack Query + Zustand

Follow the 2025 best practice of separating server state (TanStack Query) from client state (Zustand):

```tsx
// packages/app/providers/QueryProvider.tsx
'use client'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useState, type ReactNode } from 'react'

export function QueryProvider({ children }: { children: ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60 * 1000, // 1 minute
            gcTime: 5 * 60 * 1000, // 5 minutes
          },
        },
      })
  )

  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  )
}
```

```tsx
// packages/app/features/chart/hooks/useChart.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@celestia/db'

export function useChart(id: string | undefined) {
  return useQuery({
    queryKey: ['chart', id],
    queryFn: async () => {
      if (!id) return null
      const { data, error } = await supabase
        .from('charts')
        .select('*')
        .eq('id', id)
        .single()

      if (error) throw error
      return data
    },
    enabled: !!id,
  })
}

export function useChartMutations() {
  const queryClient = useQueryClient()

  const createChart = useMutation({
    mutationFn: async (input: CreateChartInput) => {
      // Call API route for WASM calculation
      const calcResponse = await fetch('/api/astrology/calculate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      })
      const positions = await calcResponse.json()

      // Save to database
      const { data, error } = await supabase
        .from('charts')
        .insert({
          ...input,
          planet_positions: positions,
        })
        .select()
        .single()

      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['charts'] })
    },
  })

  return { createChart }
}
```

```tsx
// packages/app/stores/chartStore.ts
import { create } from 'zustand'

interface ChartStore {
  // Client-only UI state
  selectedChartId: string | null
  isCreatingChart: boolean
  chartFormDraft: Partial<ChartFormData> | null

  // Actions
  selectChart: (id: string | null) => void
  setCreatingChart: (creating: boolean) => void
  setFormDraft: (draft: Partial<ChartFormData> | null) => void
}

export const useChartStore = create<ChartStore>((set) => ({
  selectedChartId: null,
  isCreatingChart: false,
  chartFormDraft: null,

  selectChart: (id) => set({ selectedChartId: id }),
  setCreatingChart: (creating) => set({ isCreatingChart: creating }),
  setFormDraft: (draft) => set({ chartFormDraft: draft }),
}))
```

**Confidence:** HIGH - This is the recommended 2025 pattern from multiple sources.

**Sources:**
- [React State Management 2025](https://www.developerway.com/posts/react-state-management-2025)
- [TanStack Query Documentation](https://tanstack.com/query/v4/docs/framework/react/guides/does-this-replace-client-state)

---

### 5. Clerk + Supabase RLS Integration (2025 Native Integration)

As of April 2025, use Clerk's native Supabase integration (JWT templates are deprecated):

```tsx
// packages/db/client.ts
import { createClient } from '@supabase/supabase-js'
import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import * as schema from './schema'

// For server-side (API routes) with full access
const connectionString = process.env.SUPABASE_DATABASE_URL!

export const serverDb = drizzle(
  postgres(connectionString, { prepare: false }),
  { schema }
)

// For client-side with RLS (uses Clerk session)
export function createClerkSupabaseClient(getToken: () => Promise<string | null>) {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      global: {
        fetch: async (url, options = {}) => {
          const token = await getToken()
          return fetch(url, {
            ...options,
            headers: {
              ...options.headers,
              Authorization: token ? `Bearer ${token}` : '',
            },
          })
        },
      },
    }
  )
}
```

```sql
-- Database RLS policy example (Supabase migration)
-- Enable RLS
ALTER TABLE charts ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only see their own charts
CREATE POLICY "Users can view own charts"
ON charts
FOR SELECT
USING (
  user_id = (auth.jwt() -> 'sub')::text
);

-- Policy: Users can insert their own charts
CREATE POLICY "Users can insert own charts"
ON charts
FOR INSERT
WITH CHECK (
  user_id = (auth.jwt() -> 'sub')::text
);

-- Policy: Users can update their own charts
CREATE POLICY "Users can update own charts"
ON charts
FOR UPDATE
USING (
  user_id = (auth.jwt() -> 'sub')::text
);
```

**Confidence:** HIGH - Official Clerk + Supabase documentation.

**Sources:**
- [Clerk Supabase Integration](https://clerk.com/docs/guides/development/integrations/databases/supabase)
- [Supabase Third-Party Auth - Clerk](https://supabase.com/docs/guides/auth/third-party/clerk)

---

### 6. NativeWind v4 Universal Styling

NativeWind v4 uses a JSX transform for zero-wrapper styling:

```tsx
// packages/ui/primitives/Button.tsx
import { Pressable, Text, type PressableProps } from 'react-native'
import { forwardRef } from 'react'

interface ButtonProps extends PressableProps {
  variant?: 'primary' | 'secondary' | 'ghost'
  size?: 'sm' | 'md' | 'lg'
  children: string
}

const variantStyles = {
  primary: 'bg-purple-600 active:bg-purple-700',
  secondary: 'bg-gray-200 active:bg-gray-300',
  ghost: 'bg-transparent active:bg-gray-100',
}

const sizeStyles = {
  sm: 'px-3 py-1.5',
  md: 'px-4 py-2',
  lg: 'px-6 py-3',
}

const textVariantStyles = {
  primary: 'text-white',
  secondary: 'text-gray-900',
  ghost: 'text-purple-600',
}

export const Button = forwardRef<typeof Pressable, ButtonProps>(
  ({ variant = 'primary', size = 'md', children, className, ...props }, ref) => {
    return (
      <Pressable
        ref={ref}
        className={`
          rounded-lg items-center justify-center
          ${variantStyles[variant]}
          ${sizeStyles[size]}
          ${className ?? ''}
        `}
        {...props}
      >
        <Text
          className={`
            font-semibold
            ${textVariantStyles[variant]}
            ${size === 'sm' ? 'text-sm' : size === 'lg' ? 'text-lg' : 'text-base'}
          `}
        >
          {children}
        </Text>
      </Pressable>
    )
  }
)
```

**Confidence:** HIGH - Official NativeWind v4 documentation.

**Source:** [NativeWind Documentation](https://www.nativewind.dev/)

---

### 7. Platform-Specific Chart Rendering

Use React Native Skia for mobile (performance) and D3.js + Canvas for web:

```tsx
// packages/app/features/chart/components/NatalChartRenderer/index.tsx (WEB)
'use client'

import { useEffect, useRef } from 'react'
import * as d3 from 'd3'
import type { ChartData } from '@celestia/astrology/types'

export function NatalChartRenderer({ data }: { data: ChartData }) {
  const svgRef = useRef<SVGSVGElement>(null)

  useEffect(() => {
    if (!svgRef.current || !data) return

    const svg = d3.select(svgRef.current)
    const width = 400
    const height = 400
    const radius = Math.min(width, height) / 2 - 20

    svg.selectAll('*').remove()

    const g = svg
      .attr('width', width)
      .attr('height', height)
      .append('g')
      .attr('transform', `translate(${width / 2}, ${height / 2})`)

    // Draw zodiac wheel
    const zodiacArc = d3.arc()
      .innerRadius(radius - 30)
      .outerRadius(radius)

    const zodiacData = d3.pie().value(1)(Array(12).fill(1))

    g.selectAll('.zodiac')
      .data(zodiacData)
      .enter()
      .append('path')
      .attr('class', 'zodiac')
      .attr('d', zodiacArc as any)
      .attr('fill', (_, i) => d3.schemeCategory10[i % 10])
      .attr('stroke', '#333')

    // Draw planet positions
    Object.entries(data.positions).forEach(([planet, pos]) => {
      const angle = (pos.longitude - 90) * (Math.PI / 180)
      const planetRadius = radius - 60
      const x = Math.cos(angle) * planetRadius
      const y = Math.sin(angle) * planetRadius

      g.append('circle')
        .attr('cx', x)
        .attr('cy', y)
        .attr('r', 8)
        .attr('fill', getPlanetColor(planet))
        .attr('stroke', '#000')

      g.append('text')
        .attr('x', x)
        .attr('y', y + 20)
        .attr('text-anchor', 'middle')
        .attr('font-size', '10px')
        .text(planet.substring(0, 2))
    })
  }, [data])

  return <svg ref={svgRef} className="mx-auto" />
}
```

```tsx
// packages/app/features/chart/components/NatalChartRenderer/index.native.tsx (NATIVE)
import { Canvas, Circle, Path, Skia, Text, useFont } from '@shopify/react-native-skia'
import { View } from 'react-native'
import type { ChartData } from '@celestia/astrology/types'

export function NatalChartRenderer({ data }: { data: ChartData }) {
  const font = useFont(require('./fonts/Inter-Medium.ttf'), 10)
  const width = 400
  const height = 400
  const radius = Math.min(width, height) / 2 - 20
  const centerX = width / 2
  const centerY = height / 2

  if (!font || !data) return null

  // Create zodiac wheel path
  const zodiacPath = Skia.Path.Make()
  for (let i = 0; i < 12; i++) {
    const startAngle = (i * 30 - 90) * (Math.PI / 180)
    const endAngle = ((i + 1) * 30 - 90) * (Math.PI / 180)
    // ... arc drawing logic
  }

  return (
    <View className="items-center justify-center">
      <Canvas style={{ width, height }}>
        {/* Zodiac wheel */}
        <Circle
          cx={centerX}
          cy={centerY}
          r={radius}
          color="#f0f0f0"
          style="fill"
        />
        <Circle
          cx={centerX}
          cy={centerY}
          r={radius - 30}
          color="#ffffff"
          style="fill"
        />

        {/* Planet positions */}
        {Object.entries(data.positions).map(([planet, pos]) => {
          const angle = (pos.longitude - 90) * (Math.PI / 180)
          const planetRadius = radius - 60
          const x = centerX + Math.cos(angle) * planetRadius
          const y = centerY + Math.sin(angle) * planetRadius

          return (
            <Circle
              key={planet}
              cx={x}
              cy={y}
              r={8}
              color={getPlanetColor(planet)}
            />
          )
        })}
      </Canvas>
    </View>
  )
}
```

**Confidence:** HIGH - React Native Skia and D3.js are well-documented.

**Sources:**
- [React Native Skia](https://shopify.github.io/react-native-skia/)
- [D3.js + React Integration](https://www.sitepoint.com/d3-js-react-interactive-data-visualizations/)

---

### 8. Payment Integration: Stripe (Web) + RevenueCat (Mobile)

```tsx
// apps/web/app/api/webhooks/stripe/route.ts
import { headers } from 'next/headers'
import { NextResponse } from 'next/server'
import Stripe from 'stripe'
import { serverDb } from '@celestia/db'
import { users } from '@celestia/db/schema'
import { eq } from 'drizzle-orm'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)

export async function POST(request: Request) {
  const body = await request.text()
  const signature = headers().get('stripe-signature')!

  let event: Stripe.Event

  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    )
  } catch (err) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object as Stripe.Checkout.Session
      const userId = session.metadata?.userId

      if (userId) {
        await serverDb
          .update(users)
          .set({ subscription_tier: 'premium' })
          .where(eq(users.clerk_id, userId))
      }
      break
    }

    case 'customer.subscription.deleted': {
      const subscription = event.data.object as Stripe.Subscription
      const customerId = subscription.customer as string

      // Look up user by Stripe customer ID and downgrade
      const user = await serverDb.query.users.findFirst({
        where: eq(users.stripe_customer_id, customerId)
      })

      if (user) {
        await serverDb
          .update(users)
          .set({ subscription_tier: 'free' })
          .where(eq(users.id, user.id))
      }
      break
    }
  }

  return NextResponse.json({ received: true })
}
```

```tsx
// apps/web/app/api/webhooks/revenuecat/route.ts
import { NextResponse } from 'next/server'
import { serverDb } from '@celestia/db'
import { users } from '@celestia/db/schema'
import { eq } from 'drizzle-orm'

interface RevenueCatWebhook {
  event: {
    type: string
    app_user_id: string
    product_id: string
  }
}

export async function POST(request: Request) {
  // Verify webhook signature
  const authHeader = request.headers.get('Authorization')
  if (authHeader !== `Bearer ${process.env.REVENUECAT_WEBHOOK_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body: RevenueCatWebhook = await request.json()
  const { event } = body

  switch (event.type) {
    case 'INITIAL_PURCHASE':
    case 'RENEWAL': {
      await serverDb
        .update(users)
        .set({ subscription_tier: 'premium' })
        .where(eq(users.clerk_id, event.app_user_id))
      break
    }

    case 'EXPIRATION':
    case 'CANCELLATION': {
      await serverDb
        .update(users)
        .set({ subscription_tier: 'free' })
        .where(eq(users.clerk_id, event.app_user_id))
      break
    }
  }

  return NextResponse.json({ received: true })
}
```

**Confidence:** HIGH - Official Stripe and RevenueCat webhook documentation.

**Sources:**
- [RevenueCat Stripe Integration](https://www.revenuecat.com/docs/web/integrations/stripe)
- [RevenueCat Webhooks](https://www.revenuecat.com/docs/integrations/webhooks)

---

## Data Flow Diagrams

### User Authentication Flow

```
+------------------+    +------------------+    +------------------+
|    Mobile App    |    |     Web App      |    |      Clerk       |
+------------------+    +------------------+    +------------------+
        |                       |                       |
        |  1. Sign in request   |                       |
        |---------------------->|                       |
        |                       |  2. Redirect to Clerk |
        |                       |---------------------->|
        |                       |                       |
        |                       |  3. OAuth/Email flow  |
        |                       |<--------------------->|
        |                       |                       |
        |                       |  4. JWT token         |
        |                       |<----------------------|
        |                       |                       |
        |  5. Token stored      |                       |
        |<----------------------|                       |
        |                       |                       |
        +------------------+    +------------------+    +------------------+
                |                       |                       |
                v                       v                       v
        +------------------------------------------------------------------+
        |                          Supabase                                |
        +------------------------------------------------------------------+
        |  6. JWT verified via auth.jwt()                                  |
        |  7. RLS policies enforce user_id = auth.jwt() -> 'sub'           |
        +------------------------------------------------------------------+
```

### Chart Calculation Flow

```
+-------------+     +--------------+     +------------------+     +------------+
| Mobile App  |     |   Web App    |     |   API Route      |     |  Supabase  |
+-------------+     +--------------+     +------------------+     +------------+
      |                   |                     |                      |
      | 1. Create chart   |                     |                      |
      |------------------>|                     |                      |
      |                   | 2. POST /api/       |                      |
      |                   |    astrology/calc   |                      |
      |                   |------------------->|                      |
      |                   |                     |                      |
      |                   |                     | 3. Load swisseph-wasm|
      |                   |                     |    (cached singleton)|
      |                   |                     |                      |
      |                   |                     | 4. Calculate positions
      |                   |                     |    with Julian day   |
      |                   |                     |                      |
      |                   | 5. Return positions |                      |
      |                   |<-------------------|                      |
      |                   |                     |                      |
      |                   | 6. Save to DB       |                      |
      |                   |------------------------------------------>|
      |                   |                     |                      |
      | 7. Display chart  |                     |                      |
      |<------------------|                     |                      |
      |                   |                     |                      |
```

### Subscription Sync Flow

```
+----------+    +----------+    +-----------+    +------------+    +----------+
| iOS User |    | RevenueCat|    | Webhook  |    |  Supabase  |    | Web User |
+----------+    +----------+    +-----------+    +------------+    +----------+
     |               |               |                |                 |
     | 1. IAP        |               |                |                 |
     |-------------->|               |                |                 |
     |               | 2. Webhook    |                |                 |
     |               |-------------->|                |                 |
     |               |               | 3. Update tier |                 |
     |               |               |--------------->|                 |
     |               |               |                |                 |
     |               |               |                |  4. Query tier  |
     |               |               |                |<----------------|
     |               |               |                |  5. Return      |
     |               |               |                |---------------->|
     |               |               |                |                 |
     | 6. Sync       |               |                |                 |
     |   entitlements|               |                |                 |
     |<--------------|               |                |                 |

+----------+    +-----------+    +-----------+    +------------+
| Web User |    |   Stripe  |    |  Webhook  |    |  Supabase  |
+----------+    +-----------+    +-----------+    +------------+
     |               |                |                |
     | 1. Checkout   |                |                |
     |-------------->|                |                |
     |               | 2. Webhook     |                |
     |               |--------------->|                |
     |               |                | 3. Update tier |
     |               |                |--------------->|
     |               |                |                |
     | 4. Redirect   |                |                |
     |   to app      |                |                |
     |<--------------|                |                |
```

---

## Anti-Patterns to Avoid

| Anti-Pattern | Why It's Bad | Better Approach |
|-------------|--------------|-----------------|
| **Bundling WASM in mobile app** | Bloats app size by 90MB+, slow startup, battery drain | Keep WASM server-side only; mobile calls API routes |
| **Using `.web.tsx` files** | Solito v5 deprecated this; causes web bundler config headaches | Use `.native.tsx` overrides with web-first defaults |
| **Duplicate React versions** | Causes terrible bugs with hooks, context breaking | Use `yarn why react` / `syncpack` to ensure single version |
| **Installing deps in wrong package** | Version mismatches cause runtime errors | Install shared JS deps in `packages/app`, platform-specific in apps |
| **Using Zustand for server state** | Inefficient caching, no background refetch, stale data | Use TanStack Query for server state, Zustand only for UI state |
| **Direct Supabase access from mobile** | RLS still works, but WASM calculations impossible | Always route through API; use Supabase for data only |
| **Shared chart rendering code** | Web D3.js != React Native Skia; forcing one breaks the other | Platform-specific implementations with shared data types |
| **Clerk JWT templates (deprecated)** | Being phased out by April 2025; will incur extra charges | Use native Clerk Supabase integration |
| **Replacing all IAP with Stripe** | Lower conversion rates; only US users can bypass IAP | Use Stripe as complement for US web users; keep native IAP |
| **Nested workspace packages** | e.g., `apps/**` - ambiguous, breaks package managers | Use flat structure: `apps/*`, `packages/*` |

---

## Version Recommendations

| Technology | Recommended Version | Rationale |
|-----------|---------------------|-----------|
| **Turborepo** | 2.x (latest) | Rust rewrite, significantly faster caching |
| **Next.js** | 15.x | App Router stable, React 19 compatible, Solito 5 support |
| **Expo SDK** | 52 | React 19 support, New Architecture ready, Expo Router v4 |
| **Solito** | 5.x | Web-first architecture, no react-native-web dependency on web |
| **React** | 19.x | Required for Next.js 15 + Expo SDK 52 |
| **NativeWind** | 4.x (or 5.x when stable) | JSX transform, v5 adds Reanimated CSS animations |
| **Drizzle ORM** | Latest | Pure TypeScript schema, great Supabase support |
| **TanStack Query** | 5.x | React 19 compatible, improved caching |
| **Zustand** | 5.x | React 19 compatible, useSyncExternalStore |
| **React Native Skia** | 1.x (latest) | Fabric-ready, WASM for web |
| **swisseph-wasm** | Latest | Pure JS + WASM, no native deps |

---

## Sources & Confidence Levels

### HIGH Confidence (Official Documentation)

1. [Solito Official Documentation](https://solito.dev/) - Universal navigation patterns
2. [Solito v5 Upgrade Guide](https://solito.dev/v5) - Web-first architecture
3. [Turborepo Documentation](https://turborepo.com/docs) - Monorepo structure
4. [NativeWind Documentation](https://www.nativewind.dev/) - Universal styling
5. [Clerk Supabase Integration](https://clerk.com/docs/guides/development/integrations/databases/supabase) - Auth + RLS
6. [Supabase Drizzle Guide](https://supabase.com/docs/guides/database/drizzle) - Database integration
7. [RevenueCat Stripe Integration](https://www.revenuecat.com/docs/web/integrations/stripe) - Payment sync
8. [TanStack Query Docs](https://tanstack.com/query) - Server state management
9. [React Native Skia](https://shopify.github.io/react-native-skia/) - Mobile charts
10. [Expo Documentation](https://docs.expo.dev/) - Mobile development

### MEDIUM Confidence (Reputable Articles/Guides)

1. [Solito 5 Web-First Architecture - DEV Community](https://dev.to/redbar0n/solito-5-is-now-web-first-but-still-unifies-nextjs-and-react-native-2lek) - v5 patterns
2. [React State Management 2025](https://www.developerway.com/posts/react-state-management-2025) - State patterns
3. [React Native Tech Stack 2025](https://galaxies.dev/article/react-native-tech-stack-2025) - Stack recommendations
4. [Callstack Solito 5 Overview](https://www.callstack.com/events/exploring-solito-5-building-cross-platform-apps-with-react-and-react-native) - Architecture insights

### LOW Confidence (Community/Blogs)

1. [swisseph-wasm GitHub](https://github.com/prolaxu/swisseph-wasm) - API patterns (limited documentation)
2. [D3.js React Integration](https://www.sitepoint.com/d3-js-react-interactive-data-visualizations/) - Web chart patterns

---

## Summary

This architecture leverages Solito v5's web-first approach to maximize code sharing (~90%) while respecting platform-specific needs:

1. **Monorepo Structure**: Turborepo with `apps/` shells and `packages/` shared code
2. **Navigation**: Solito hooks work identically on web (Next.js) and mobile (Expo Router)
3. **Styling**: NativeWind v4 provides Tailwind classes that compile to platform-native styles
4. **Data**: Drizzle ORM + Supabase with RLS policies tied to Clerk JWT
5. **State**: TanStack Query for server state, Zustand for client-only UI state
6. **Payments**: Stripe (web) + RevenueCat (mobile) with webhook sync to single subscription_tier
7. **Charts**: D3.js + Canvas (web) / React Native Skia (mobile) with shared data types
8. **Astrology Engine**: swisseph-wasm server-side only via API routes

The key architectural decision is keeping heavy computation (WASM) and sensitive operations (webhooks, auth) on the server while maximizing UI code sharing through Solito's platform-agnostic navigation and NativeWind's universal styling.
