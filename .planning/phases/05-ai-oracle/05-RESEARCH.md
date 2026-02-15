# Phase 5: AI Oracle - Research

**Researched:** 2026-02-15
**Domain:** AI streaming, Gemini API, prompt engineering, subscription-gated content
**Confidence:** HIGH (core stack), MEDIUM (cross-highlighting pattern, teaser approach)

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Reading presentation**
- Side panel layout: reading appears in a panel next to the chart (desktop), below on mobile
- Long readings (7+ paragraphs): detailed analysis of relevant placements, feels like a full consultation
- Streaming display: token-by-token streaming like ChatGPT — reading streams in as it generates
- Cross-highlighting: when reading mentions a planet (e.g., "Your Mars in Scorpio"), that planet highlights on the natal wheel — chart and reading feel connected

**Topic selection flow**
- Topic cards UI: visual cards for each topic (icon + label) — user taps one to generate
- Premium topics show lock icon for free users
- Inline teaser for locked topics: blurred/faded preview of what the reading would say, with upgrade CTA overlaying it — builds desire
- Require tap to generate: general reading does NOT auto-generate when viewing chart — user sees topic cards and chooses intentionally
- Multiple saved readings: user can generate general, then love, then career — all saved and accessible via their topic cards

**AI personality & tone**
- Mystical guide voice: elevated, poetic, with spiritual overtones
- Moderate mysticism level: regular mystical phrasing (cosmic energy, celestial influences, spiritual path) but grounded in actual chart data — no crystal/chakra talk
- Second person address ("you" / "Вашият"): personal and direct
- Subtle topic variation: same base mystical guide voice, but love reads warmer, career reads more assertive, health reads more nurturing

**Caching & regeneration**
- Readings expire after 7 days — encourages re-engagement with fresh content
- Manual regeneration available but rate-limited (once per day) — prevents API abuse while giving flexibility
- Multiple topic readings saved simultaneously per user/chart
- Primary AI provider: Gemini (Google) — strong Bulgarian language support

### Claude's Discretion
- Exact streaming implementation (SSE vs WebSocket)
- Gemini model version selection
- Loading states and error handling patterns
- Blurred teaser generation approach (real preview vs placeholder)
- Database schema for storing readings (table structure, indexing)
- Prompt engineering specifics (system prompt structure, few-shot examples)

### Deferred Ideas (OUT OF SCOPE)
None — discussion stayed within phase scope
</user_constraints>

---

## Summary

Phase 5 adds AI-generated natal chart readings powered by Google Gemini, streamed token-by-token into a side panel next to the chart visualization. The Vercel AI SDK (`ai` + `@ai-sdk/google`) is the right integration layer: it provides a unified streaming API that wraps Gemini's `streamGenerateContent` endpoint, handles SSE protocol details for Next.js App Router, and gives the client a `useCompletion` hook that drives real-time display. This avoids the known pitfall of raw SSE in Next.js App Router where the response buffer is held until the handler completes.

The database schema requires a new `ai_readings` table storing per-topic readings with a 7-day expiry timestamp and a per-user `ai_reading_regenerations` rate-limit tracker (or the regeneration limit can be embedded in the readings row). The `users` table needs to be created in `packages/db/src/schema/` — it's documented in the roadmap but not yet implemented in schema code. Subscription tier gating reads from `users.subscription_tier`, which defaults to `'free'` and is upgraded by Stripe/RevenueCat webhooks (Phase 7).

Cross-highlighting between reading text and the D3 chart wheel is the most novel interaction. The recommended pattern is: the AI is prompted to wrap planet mentions in a sentinel syntax (e.g. `[planet:mars]Your Mars in Scorpio[/planet]`), the client parser scans accumulated text for these markers, and the existing `selectedPlanet` state prop in `ChartView` / `NatalWheel` is called with the planet name — reusing the already-built highlight path from Phase 4.

**Primary recommendation:** Use Vercel AI SDK (`ai` + `@ai-sdk/google`) for streaming, Gemini 2.5 Flash as the model, and a new `ai_readings` Drizzle table with `expires_at` for caching. Implement cross-highlighting via sentinel-tagged output parsed client-side.

---

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `ai` (Vercel AI SDK) | 4.x | Streaming orchestration, `useCompletion` / `useChat` React hooks, `streamText` server helper | Purpose-built for Next.js App Router streaming; handles SSE buffering correctly; provider-agnostic |
| `@ai-sdk/google` | 1.x | Gemini provider for Vercel AI SDK | Official Vercel provider; routes to Gemini's `streamGenerateContent` SSE endpoint |
| `@google/genai` | 1.x | Google Gen AI JS SDK (underlying) | Required by `@ai-sdk/google`; can also be used directly if fine-grained control needed |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `@upstash/ratelimit` + `@upstash/redis` | latest | Per-user regeneration rate limiting (1 per day) | If Supabase-native rate tracking feels heavy; Upstash is serverless-native |
| Native Supabase column | — | Alternatively: store `last_regenerated_at` in `ai_readings` row | Simpler if Upstash is not already in the project; avoids new external service |

**Recommendation on rate limiting:** Use a `last_regenerated_at` timestamp column in the `ai_readings` table. No external service needed — the API route checks `NOW() - last_regenerated_at < 24 hours` before allowing regeneration. Upstash adds operational overhead that is not justified here.

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Vercel AI SDK | Raw `@google/genai` `generateContentStream` | More control but requires manual SSE wiring in Next.js App Router, known buffering pitfalls |
| Vercel AI SDK | OpenAI SDK with GPT-5 | User locked Gemini as primary; GPT-5 not yet GA as of research date |
| Gemini 2.5 Flash | Gemini 2.5 Pro | Pro has better reasoning but 3-4x cost; Flash sufficient for natal reading quality |
| Gemini 2.5 Flash | Gemini 2.0 Flash | 2.5 Flash is newer (Jan 2025 training cutoff vs Aug 2024), better multilingual quality, similar cost |

**Installation:**
```bash
pnpm add ai @ai-sdk/google @ai-sdk/react
# (in apps/web — @google/genai is pulled in transitively by @ai-sdk/google)
```

---

## Architecture Patterns

### Recommended Project Structure

```
apps/web/
├── app/api/oracle/
│   ├── generate/route.ts     # POST: start streaming generation (SSE)
│   └── readings/route.ts     # GET: fetch saved readings for a chart
├── components/oracle/
│   ├── OraclePanel.tsx        # Main side panel container
│   ├── TopicCards.tsx         # Topic card grid (general/love/career/health)
│   ├── ReadingStream.tsx      # Streams reading, parses cross-highlight markers
│   ├── LockedTopicTeaser.tsx  # Blurred preview + upgrade CTA overlay
│   └── TopicCard.tsx          # Single card (unlocked / locked / active)
├── hooks/
│   └── useOracleReading.ts    # Wraps useCompletion, manages topic state
└── lib/oracle/
    ├── prompts.ts              # System prompt builder, topic prompt templates
    ├── chart-to-prompt.ts      # Formats ChartData into textual planet summary
    └── planet-parser.ts        # Parses [planet:x]...[/planet] sentinels from stream

packages/db/src/schema/
├── users.ts                   # NEW: users table (clerk_id, subscription_tier)
└── ai-readings.ts             # NEW: ai_readings table
```

### Pattern 1: Streaming API Route with Vercel AI SDK

**What:** POST route returns a data stream using `streamText` + `result.toDataStreamResponse()`. Next.js App Router handles the response correctly because `toDataStreamResponse()` returns the `Response` immediately while piping chunks in the background.

**When to use:** Any time you need token-by-token streaming to the browser.

**Example:**
```typescript
// Source: https://v4.ai-sdk.dev/docs/ai-sdk-ui/stream-protocol
// apps/web/app/api/oracle/generate/route.ts
import { streamText } from 'ai'
import { google } from '@ai-sdk/google'
import { auth } from '@clerk/nextjs/server'

export const maxDuration = 60 // Gemini readings may be long

export async function POST(req: Request) {
  const { userId } = await auth()
  if (!userId) return Response.json({ error: 'Неоторизиран достъп' }, { status: 401 })

  const { chartId, topic } = await req.json()

  // 1. Verify user owns chart, check subscription_tier for topic access
  // 2. Load chart calculation from chart_calculations table
  // 3. Build prompt from chart data
  // 4. Check/update reading cache (ai_readings table)

  const result = streamText({
    model: google('gemini-2.5-flash'),
    system: buildSystemPrompt(topic),
    prompt: buildChartPrompt(chartData),
    temperature: 0.85,
    maxTokens: 2000,
  })

  return result.toDataStreamResponse()
}
```

### Pattern 2: Client-Side Streaming Hook

**What:** `useCompletion` from `@ai-sdk/react` drives the streaming display. The `completion` string grows token-by-token and feeds into the parser.

**Example:**
```typescript
// Source: https://v4.ai-sdk.dev/docs/ai-sdk-ui/stream-protocol
// hooks/useOracleReading.ts
import { useCompletion } from '@ai-sdk/react'

export function useOracleReading(chartId: string, topic: string) {
  const { completion, isLoading, complete, error } = useCompletion({
    api: '/api/oracle/generate',
    body: { chartId, topic },
    streamProtocol: 'data', // Vercel AI SDK data stream format
  })

  return { completion, isLoading, complete, error }
}
```

### Pattern 3: Cross-Highlighting via Sentinel Parsing

**What:** Prompt instructs Gemini to wrap planet mentions with `[planet:mars]text[/planet]`. Client parser scans the accumulated `completion` string for complete marker pairs, extracts planet names, and calls the existing `onPlanetSelect` callback from `ChartView`.

**Why sentinels, not plain-text regex:** Planet names appear naturally in astrological text in multiple languages and contexts. A sentinel gives unambiguous signal. The parser only fires `onPlanetSelect` when a **complete** `[planet:X]...[/planet]` pair appears in the stream — partial tokens mid-marker are safe to ignore.

**Example:**
```typescript
// lib/oracle/planet-parser.ts
const PLANET_MARKER_RE = /\[planet:(\w+)\](.*?)\[\/planet\]/gs

export function extractPlanetMentions(text: string): string[] {
  const planets: string[] = []
  let match
  while ((match = PLANET_MARKER_RE.exec(text)) !== null) {
    planets.push(match[1]) // e.g. 'mars'
  }
  return planets
}

export function stripSentinels(text: string): string {
  // Replace [planet:X]content[/planet] with just content for display
  return text.replace(PLANET_MARKER_RE, '$2')
}
```

```tsx
// components/oracle/ReadingStream.tsx
useEffect(() => {
  const mentioned = extractPlanetMentions(completion)
  if (mentioned.length > 0) {
    // Highlight the most recently mentioned planet
    onPlanetHighlight(mentioned[mentioned.length - 1])
  }
}, [completion])

// Display strips sentinels before rendering
const displayText = stripSentinels(completion)
```

### Pattern 4: Blurred Teaser for Locked Topics

**What:** For premium topics shown to free users, generate a short teaser (2-3 sentences) server-side at reading-request time, store it in the `ai_readings` row, and display it with `filter: blur(8px)` + an upgrade CTA overlay. No separate teaser generation call — the teaser is part of the full reading stored truncated.

**Implementation approach:**
- Generate full reading for premium user OR a 2-3 sentence teaser for free user (separate shorter prompt)
- Store teaser in `ai_readings.teaser_content` (nullable text column)
- Display: Tailwind `filter blur-sm select-none pointer-events-none` on teaser text, absolute-positioned upgrade CTA on top

**Example (Tailwind blur teaser):**
```tsx
// components/oracle/LockedTopicTeaser.tsx
<div className="relative">
  <p className="blur-sm select-none pointer-events-none text-slate-300 leading-relaxed">
    {teaserContent}
  </p>
  <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-t from-slate-900/80 to-transparent">
    <button className="rounded-lg bg-purple-600 px-4 py-2 text-sm font-medium text-white">
      Отключете с Premium
    </button>
  </div>
</div>
```

### Pattern 5: Database Schema for Readings

**What:** New `ai_readings` table stores per-chart, per-topic readings with expiry and regeneration tracking.

```typescript
// packages/db/src/schema/ai-readings.ts
import { pgTable, uuid, text, timestamp, pgPolicy } from 'drizzle-orm/pg-core'
import { sql } from 'drizzle-orm'
import { authenticatedRole } from 'drizzle-orm/supabase'
import { charts } from './charts'

export const aiReadings = pgTable(
  'ai_readings',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    chartId: uuid('chart_id').notNull().references(() => charts.id, { onDelete: 'cascade' }),
    userId: text('user_id').notNull().default(sql`(select auth.jwt()->>'sub')`),
    topic: text('topic').notNull(), // 'general' | 'love' | 'career' | 'health'
    content: text('content').notNull(),         // Full reading text (with sentinels stripped before storage)
    teaserContent: text('teaser_content'),      // Short preview for locked-topic display
    generatedAt: timestamp('generated_at', { withTimezone: true }).defaultNow().notNull(),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(), // generatedAt + 7 days
    lastRegeneratedAt: timestamp('last_regenerated_at', { withTimezone: true }),
    modelVersion: text('model_version').notNull(), // e.g. 'gemini-2.5-flash' — tracks which model generated it
  },
  (table) => [
    pgPolicy('ai_readings_select_own', {
      for: 'select',
      to: authenticatedRole,
      using: sql`(select auth.jwt()->>'sub') = ${table.userId}`,
    }),
    pgPolicy('ai_readings_insert_own', {
      for: 'insert',
      to: authenticatedRole,
      withCheck: sql`(select auth.jwt()->>'sub') = ${table.userId}`,
    }),
    pgPolicy('ai_readings_update_own', {
      for: 'update',
      to: authenticatedRole,
      using: sql`(select auth.jwt()->>'sub') = ${table.userId}`,
    }),
  ]
).enableRLS()
```

**Unique constraint:** Add a unique index on `(chart_id, topic)` — one live reading per chart-topic pair. On regeneration, upsert replaces the row.

### Pattern 6: Users Table (not yet in schema)

The `users` table is referenced in planning docs but not implemented in `packages/db/src/schema/`. This phase requires it for `subscription_tier` lookup. Minimal schema needed:

```typescript
// packages/db/src/schema/users.ts
import { pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core'
import { sql } from 'drizzle-orm'

export const users = pgTable('users', {
  id: uuid('id').defaultRandom().primaryKey(),
  clerkId: text('clerk_id').notNull().unique(),
  subscriptionTier: text('subscription_tier').notNull().default('free'), // 'free' | 'premium'
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
})
```

This table is accessed via the **service role client** in API routes (not user-facing RLS), consistent with how `chart_calculations` is accessed. Full RLS + Stripe integration comes in Phase 7.

### Pattern 7: Prompt Engineering for Bulgarian Astrological Readings

**What:** System prompt establishes the mystical guide persona. User prompt injects serialized chart data. Topic variation is handled by swapping a topic-specific suffix on the system prompt.

**System prompt structure:**
```
You are Celestia, a wise and poetic astral guide. You speak directly to the person in second person,
in Bulgarian (Вашият, Вие). Your voice is elevated and mystical — you reference cosmic energies
and celestial patterns — but you stay grounded in the actual chart data. No crystal or chakra
references. Use language like "звездите са изтъкали", "небесните влияния", "вашият космически път".

When you mention a planet by name, wrap it in markers: [planet:mars]Вашият Марс[/planet].
Use the planet's English key in the marker (sun, moon, mercury, venus, mars, jupiter, saturn,
uranus, neptune, pluto), but refer to it in Bulgarian text inside the markers.

Write 7-9 paragraphs. Each paragraph focuses on one placement or interaction. Always cite the
exact degree: "Вашият Слънце на 15 градуса Лъв" (not "Слънце в Лъв").

[TOPIC-SPECIFIC SUFFIX appended here per topic]
```

**Topic suffixes:**
- `general`: "Focus on personality, life path, and core character from Sun, Moon, Ascendant, and chart shape."
- `love`: "Focus on Venus, 7th house, Moon, and aspect patterns relevant to relationships and love. Write with warmth."
- `career`: "Focus on 10th house, MC, Saturn, and Sun in the context of vocation and ambition. Write assertively."
- `health`: "Focus on 6th house, Chiron (if in data), and Mars in the context of vitality and wellness. Write with nurturing care."

**Chart data serialization (chart-to-prompt.ts):**
```typescript
export function chartToPromptText(chart: ChartData): string {
  const planets = chart.planets.map(p =>
    `${p.planet}: ${p.signDegree.toFixed(1)}° ${p.sign}, дом ${p.house}${p.retrograde ? ' (ретроградна)' : ''}`
  ).join('\n')

  return `НАТАЛНА КАРТА:\n${planets}\nАсцендент: ${chart.ascendant.degree.toFixed(1)}° ${chart.ascendant.sign}\nMC: ${chart.mc.degree.toFixed(1)}° ${chart.mc.sign}`
}
```

### Anti-Patterns to Avoid

- **Raw SSE loop before returning Response in Next.js:** If you `for await (chunk of stream) { enqueue() }` before `return new Response(...)`, Next.js buffers the whole response. Always use `result.toDataStreamResponse()` which returns `Response` immediately. (Source: multiple GitHub discussions, verified pattern from Vercel AI SDK docs)
- **Generating teasers with a separate streaming request:** Adds latency and complexity. Generate teaser with a non-streaming `generateText` call during the main flow, stored once.
- **Storing raw reading with sentinels in the database:** Strip `[planet:X]...[/planet]` markers before writing to `ai_readings.content`. Sentinels are transient display hints, not content.
- **Prompting for translation:** Always prompt Gemini to write *natively in Bulgarian*, not to translate from English. Gemini 2.5 Flash supports Bulgarian natively; translation artifacts degrade quality.
- **Topic-gating on the client only:** Always enforce `subscription_tier` in the API route server-side. Client-side lock icons are UX, not security.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| SSE streaming in Next.js App Router | Custom ReadableStream + chunk loop + Response constructor | Vercel AI SDK `streamText().toDataStreamResponse()` | Known buffering bug with DIY approach; SDK handles it correctly |
| Token-by-token display state | Manual fetch + ReadableStream reader + useState accumulator | `useCompletion` from `@ai-sdk/react` | Handles reconnect, error state, loading, abort — 30+ lines vs 5 |
| Gemini API key auth + request format | Direct HTTP to `generativelanguage.googleapis.com` | `@ai-sdk/google` provider | SDK handles auth headers, SSE parsing, safety settings, retries |
| Rate limiting per-user per-day | Redis key with expiry, sliding window logic | `last_regenerated_at` timestamp column + SQL `NOW() - interval '24 hours'` check | No extra service; simpler; sufficient for this use case |

**Key insight:** The streaming display problem is solved infrastructure. The unique work in this phase is prompt engineering, the cross-highlight parser, and the topic card UX — not plumbing.

---

## Common Pitfalls

### Pitfall 1: Next.js App Router Streaming Buffering

**What goes wrong:** Response arrives all at once instead of streaming. Feels like a loading spinner then instant dump of text.

**Why it happens:** If you build a raw `ReadableStream` and call `await` on any async operation inside the `start()` constructor before closing it, or if you do `for await (const chunk of aiStream)` then return the Response after the loop, Next.js captures the full body first.

**How to avoid:** Always use `result.toDataStreamResponse()` from the Vercel AI SDK. Set `export const maxDuration = 60` at the top of the route file to prevent premature function timeout on Vercel.

**Warning signs:** Works in `next dev` but doesn't stream in production. Or the entire reading appears instantly.

### Pitfall 2: Sentinel Markers Breaking Mid-Token

**What goes wrong:** The LLM streams `[plane` then `t:mars]text[/pla` then `net]` — partial markers in intermediate chunks make parsing emit incorrect highlights or display garbage characters.

**Why it happens:** Tokens don't align with character boundaries of your sentinel syntax.

**How to avoid:** Parse only the *accumulated* `completion` string (not individual chunks). The regex runs on the full accumulated text and only fires `onPlanetHighlight` when a complete `[planet:X]...[/planet]` pair is present. Display via `stripSentinels(completion)` which also only fires when markers are complete.

**Warning signs:** Weird characters flickering in the reading text during streaming.

### Pitfall 3: Gemini Ignoring Sentinel Instruction

**What goes wrong:** Gemini generates beautiful Bulgarian text but doesn't use `[planet:mars]...[/planet]` markers, so cross-highlighting never fires.

**Why it happens:** Instructions to use custom syntax compete with Gemini's tendency to produce clean prose. If the system prompt buries the instruction or makes it feel optional, Gemini may omit it.

**How to avoid:** Put the sentinel instruction in a clearly demarcated section of the system prompt. Include a one-shot example showing correct usage. Test on several chart configurations. Consider a post-processing fallback: if `extractPlanetMentions(completion).length === 0` after streaming completes, run a regex over the final text to find planet name mentions in Bulgarian and trigger highlights that way.

**Warning signs:** Cross-highlights never fire regardless of what chart you use.

### Pitfall 4: 7-Day Expiry Serving Stale Readings

**What goes wrong:** User regenerates chart or changes birth data, but the Oracle still shows a reading generated from old data (expired but cached).

**Why it happens:** `expires_at` is 7 days from generation, but the underlying chart might have changed in `charts` or `chart_calculations`.

**How to avoid:** On `chart_calculations` update (i.e. if the chart recalculates), cascade-invalidate readings by deleting `ai_readings` rows for that `chart_id`. Or add a `chart_calculation_id` FK to `ai_readings` and invalidate when it changes.

**Warning signs:** User updates birth time, but Oracle still cites old ascendant degree.

### Pitfall 5: Subscription Tier Race Condition

**What goes wrong:** User is mid-streaming a premium reading when their subscription lapses (webhook arrives). Reading completes successfully, but user is now free tier — they "got" a premium reading for free.

**Why it happens:** Tier check happens at request start, not per-chunk.

**How to avoid:** This is acceptable. Check tier once at request initiation and honour that decision for the stream. Don't re-check mid-stream. Document as known acceptable behavior. Phase 7 will add webhook handling.

### Pitfall 6: Cold Start / Gemini Latency on First Token

**What goes wrong:** User taps "Generate", sees spinner for 3-5 seconds, then streaming begins. Feels like the product is slow.

**Why it happens:** Gemini 2.5 Flash has a thinking step before first token. Long system prompts add latency.

**How to avoid:** Show a purposeful loading animation ("Celestia консултира звездите...") immediately on tap. This is UX masking, not a technical fix. First-token latency for Gemini 2.5 Flash is typically 2-4 seconds for a 500-token prompt — plan the loading state accordingly.

---

## Code Examples

Verified patterns from official sources:

### Streaming API Route (Vercel AI SDK + Google Gemini)

```typescript
// Source: https://v4.ai-sdk.dev/docs/ai-sdk-ui/stream-protocol
// apps/web/app/api/oracle/generate/route.ts
import { streamText } from 'ai'
import { google } from '@ai-sdk/google'
import { auth } from '@clerk/nextjs/server'

export const maxDuration = 60

export async function POST(req: Request) {
  const { userId } = await auth()
  if (!userId) {
    return Response.json({ error: 'Неоторизиран достъп' }, { status: 401 })
  }

  const { chartId, topic } = await req.json()

  // Server-side tier check
  const user = await getUserByClerkId(userId)
  const premiumTopics = ['love', 'career', 'health']
  if (premiumTopics.includes(topic) && user.subscriptionTier !== 'premium') {
    return Response.json({ error: 'Premium required' }, { status: 403 })
  }

  // Load chart data, build prompt...
  const chartData = await getChartCalculation(chartId)
  const systemPrompt = buildSystemPrompt(topic)
  const userPrompt = chartToPromptText(chartData)

  const result = streamText({
    model: google('gemini-2.5-flash'),
    system: systemPrompt,
    prompt: userPrompt,
    temperature: 0.85,
    maxTokens: 2000,
  })

  return result.toDataStreamResponse()
}
```

### Client Hook (useCompletion)

```typescript
// Source: https://v4.ai-sdk.dev/docs/ai-sdk-ui/stream-protocol
// hooks/useOracleReading.ts
'use client'
import { useCompletion } from '@ai-sdk/react'
import { useCallback } from 'react'

export function useOracleReading(chartId: string) {
  const { completion, isLoading, complete, error, stop } = useCompletion({
    api: '/api/oracle/generate',
    streamProtocol: 'data',
  })

  const generateReading = useCallback((topic: string) => {
    complete('', { body: { chartId, topic } })
  }, [chartId, complete])

  return { completion, isLoading, generateReading, error, stop }
}
```

### Direct Gemini Streaming (fallback if not using Vercel AI SDK)

```typescript
// Source: https://context7.com/googleapis/js-genai/llms.txt (Context7 verified)
import { GoogleGenAI } from '@google/genai'

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY })

const response = await ai.models.generateContentStream({
  model: 'gemini-2.5-flash',
  contents: userPrompt,
  config: {
    systemInstruction: systemPrompt,
    temperature: 0.85,
    maxOutputTokens: 2000,
  },
})

for await (const chunk of response) {
  process.stdout.write(chunk.text || '')
}
```

### Database Query: Check Valid Reading Cache

```typescript
// Check for a non-expired reading for this chart+topic
const existing = await supabase
  .from('ai_readings')
  .select('*')
  .eq('chart_id', chartId)
  .eq('topic', topic)
  .gt('expires_at', new Date().toISOString())
  .single()

if (existing.data) {
  // Return cached reading; no Gemini call needed
  return Response.json({ content: existing.data.content, cached: true })
}
```

### Regeneration Rate-Limit Check

```typescript
// Check if user can regenerate (once per day)
const reading = await supabase
  .from('ai_readings')
  .select('last_regenerated_at')
  .eq('chart_id', chartId)
  .eq('topic', topic)
  .single()

if (reading.data?.lastRegeneratedAt) {
  const lastRegen = new Date(reading.data.lastRegeneratedAt)
  const hoursSince = (Date.now() - lastRegen.getTime()) / 1000 / 3600
  if (hoursSince < 24) {
    return Response.json({ error: 'Можете да регенерирате веднъж на ден' }, { status: 429 })
  }
}
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `ai` RSC (`createStreamableUI`) | `ai` UI (`useCompletion` + route handler) | AI SDK v4 (2024) | RSC streaming deprecated; route handler approach is stable and simpler |
| `@google/generative-ai` (old package) | `@google/genai` (new unified SDK) | Mid-2024 | Old package still works but new one is the maintained path |
| `StreamingTextResponse` from `ai` | `result.toDataStreamResponse()` | AI SDK v3+ | `StreamingTextResponse` removed; new method handles protocol correctly |
| Manual SSE `text/event-stream` headers | Vercel AI SDK data stream protocol | 2024 | Manual SSE in App Router had buffering bugs that SDK solves |

**Deprecated/outdated:**
- `createStreamableUI` / `createStreamableValue` (RSC streaming): replaced by route handler + `useCompletion`
- `StreamingTextResponse`: removed from `ai` package — use `.toDataStreamResponse()`
- `@google/generative-ai`: superseded by `@google/genai`; both still work but the latter is the maintained SDK

---

## Open Questions

1. **Gemini sentinel compliance rate**
   - What we know: LLMs can be instructed to use custom markup syntax; compliance improves with one-shot examples
   - What's unclear: How reliably Gemini 2.5 Flash follows the `[planet:x]...[/planet]` instruction across diverse chart configurations and topics without fine-tuning
   - Recommendation: Build the fallback regex path (plain Bulgarian planet-name detection) from day one, so cross-highlighting degrades gracefully rather than breaks

2. **Users table prerequisite**
   - What we know: `users` table with `subscription_tier` is described in planning docs but not yet implemented in `packages/db/src/schema/`
   - What's unclear: Whether another phase created it or if this phase must create it
   - Recommendation: This phase should create the minimal `users` table (clerk_id + subscription_tier). The planner should treat `users` table creation as a prerequisite task for this phase.

3. **Teaser content for locked topics: real vs placeholder**
   - What we know: User decision says "blurred/faded preview of what the reading would say"; Vercel AI SDK makes non-streaming `generateText` easy for short outputs
   - What's unclear: Whether to generate real teasers (costs Gemini tokens, adds latency) or use static placeholder text (no cost, instant, but less compelling)
   - Recommendation: Generate real teasers lazily — when a free user taps a locked topic card, generate a 2-sentence teaser with a non-streaming Gemini call, cache it in `ai_readings.teaser_content`. Use a cheaper prompt (no sentinels, no elaborate persona). This keeps the "almost reading it" feeling the user asked for.

4. **Saving completed reading to database**
   - What we know: Streaming happens client-side via `useCompletion`; the final `completion` value is the full text
   - What's unclear: Who saves the reading to `ai_readings.content` — the client after streaming ends, or the server during generation
   - Recommendation: Server-saves. After the stream completes server-side, write to `ai_readings` in an `onFinish` callback available in Vercel AI SDK's `streamText`. This avoids a second network round-trip from the client and ensures the reading is always saved even if the client disconnects mid-stream.

5. **`onFinish` callback in Vercel AI SDK streamText**
   - What we know: `streamText` accepts an `onFinish` callback that fires when generation completes
   - What's unclear: Whether `onFinish` has access to the full text for database writes
   - Recommendation: Verify during implementation. The `onFinish` callback receives `{ text, finishReason, usage }` — use `text` to write to `ai_readings`. (Confidence: MEDIUM — from docs review, not yet tested against production behavior)

---

## Sources

### Primary (HIGH confidence)
- `/googleapis/js-genai` (Context7) — `generateContentStream`, system instructions, configuration
- `/websites/v4_ai-sdk_dev` (Context7) — `streamText`, `useCompletion`, `toDataStreamResponse`, stream protocol
- `/websites/ai_google_dev_api` (Context7) — Gemini streaming endpoints, SSE vs WebSocket, REST format
- `https://ai.google.dev/api` — Gemini API reference, endpoint types
- `https://orm.drizzle.team/docs/rls` — RLS patterns consistent with existing schema

### Secondary (MEDIUM confidence)
- WebSearch: Vercel AI SDK + Gemini integration patterns (multiple articles consistent with docs)
- WebSearch: Next.js App Router SSE buffering issue + fix (multiple GitHub discussions consistent with each other)
- WebSearch: Gemini 2.5 Flash vs 2.0 Flash comparison (multiple review sites, consistent quality/cost direction)
- WebSearch: Gemini Bulgarian language support (Google's official feature list confirms Bulgarian included)
- WebSearch: Gemini paid-tier rate limits (official rate-limits page defers to AI Studio; exact numbers from third-party aggregator — treat as approximate)

### Tertiary (LOW confidence)
- WebSearch: Gemini `onFinish` callback behavior for database writes — found in docs review but not independently verified against live behavior
- WebSearch: Gemini 2.5 Flash first-token latency estimate (2-4 seconds) — from community benchmarks, not official Google data

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — Vercel AI SDK + `@ai-sdk/google` is the documented, maintained path; confirmed via Context7
- Architecture: HIGH — patterns follow directly from verified docs; `ai_readings` schema is standard Drizzle/Supabase pattern matching existing codebase
- Prompt engineering: MEDIUM — sentinel approach is sound in principle; compliance rate untested; fallback path recommended
- Pitfalls: HIGH — streaming buffering pitfall confirmed by multiple official GitHub discussions and the Vercel AI SDK's own rationale for `toDataStreamResponse()`
- Rate limits: MEDIUM — Gemini pricing and limits are real but subject to change; December 2025 quota cuts noted

**Research date:** 2026-02-15
**Valid until:** 2026-03-15 (30 days — stable APIs; Gemini pricing may shift sooner)
