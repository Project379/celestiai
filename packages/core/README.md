# @stellaeum/core

Framework-agnostic business logic and data access. Zero framework dependencies.

## What lives here

- Plain async TypeScript functions that fetch and compose data from Supabase
- Zod schemas that describe the shape of inputs and outputs
- Pure computation (lunar phase, date utilities) shared across web and mobile

## What does NOT live here

Per `.planning/research/CACHE_WRAP_CONVENTION.md`:

- No React, React Native, Next.js, Expo, or Clerk imports. Enforced via ESLint `no-restricted-imports` in `eslint.config.mjs` — catches both value and type imports.
- No caching of any kind. Functions are idempotent and cheap to call multiple times. If a caller needs caching, it happens at the call site (`React.cache()` in Server Components, HTTP Cache-Control in route handlers, React Query on mobile).
- No auth context extraction. Functions take `userId: string | null` as an argument. The caller (Server Component, route handler, or mobile HTTP wrapper) extracts the userId from Clerk first.
- No Suspense-coupled return types. Functions return plain data or throw typed errors.

## Usage patterns

### From a Next.js Server Component (web)

```ts
// apps/web/lib/crystals/today.ts  — thin cached wrapper at call site
import { cache } from 'react'
import { getCrystalOfTheDay as coreGetCrystalOfTheDay } from '@stellaeum/core/crystals/today'

export const getCrystalOfTheDay = cache(coreGetCrystalOfTheDay)
```

```tsx
// apps/web/app/(protected)/dashboard/page.tsx
import { getCrystalOfTheDay } from '@/lib/crystals/today'
const crystal = await getCrystalOfTheDay(userId)  // React.cache dedupes within render pass
```

### From a Next.js route handler (web)

```ts
// apps/web/app/api/crystals/today/route.ts
import { auth } from '@clerk/nextjs/server'
import { getCrystalOfTheDay } from '@stellaeum/core/crystals/today'  // unwrapped core fn

export async function GET() {
  const { userId } = await auth()
  const data = await getCrystalOfTheDay(userId)
  return Response.json(data)
}
```

### From React Native (mobile)

Mobile clients don't import `@stellaeum/core` for runtime data access — the package constructs a Supabase service client with secrets, which shouldn't reach the mobile bundle. Instead, mobile calls the web route handler over HTTP:

```ts
const res = await fetch(`${API_BASE}/api/crystals/today`)
```

Mobile can import Zod schemas from `@stellaeum/core/crystals/schemas` for response validation — those are pure types and compile-time-only.

## Adding a new function

1. Write the function in `src/<domain>/<function>.ts`. Accept primitive arguments (`userId: string | null`, body payloads as Zod-validated objects). Return plain objects or throw typed errors.
2. Add Zod schemas in `src/<domain>/schemas.ts` — both input and output. Export inferred types.
3. Add a path in `package.json` `exports` so consumers can subpath-import.
4. On the web side: add a cached wrapper in `apps/web/lib/<domain>/<function>.ts`, and a thin route handler in `apps/web/app/api/<path>/route.ts`.
5. Typecheck + lint both packages.

## Enforcement layers

- `package.json` does not list `react`, `next`, `@clerk/*`, `expo*`, `react-native*`, or `nativewind` in dependencies.
- `eslint.config.mjs` `no-restricted-imports` catches attempts to import from any of those families — including type-only imports.
- ESLint runs as part of `pnpm lint` via turbo; a forbidden import fails CI.
