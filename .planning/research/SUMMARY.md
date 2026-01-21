# Celestia AI - Research Synthesis

**Synthesized:** 2026-01-21
**Source Documents:** ARCHITECTURE.md, FEATURES.md, PITFALLS.md, STACK.md
**Overall Confidence:** HIGH

---

## Executive Summary

Celestia AI is a premium astrology application targeting the Bulgarian market with Web + iOS from a single universal codebase. Research validates the chosen stack (Turborepo + Solito + Next.js 15 + Expo SDK 52+) can achieve 90%+ code sharing. The key architectural insight is **server-side WASM calculations** — Swiss Ephemeris runs only in API routes, never bundled in mobile.

**Market opportunity:** No major competitor serves Bulgarian users. First-mover advantage with localized content in an underserved €3-5B market.

**Core differentiator:** AI-powered personalized readings (Gemini/GPT-5) with professional-grade astronomical precision (Swiss Ephemeris) — combining what competitors do separately (Co-Star has AI but questionable accuracy; TimePassages has precision but dated UX).

---

## Key Architectural Decisions

| Decision | Rationale | Risk Level |
|----------|-----------|------------|
| **Server-side swisseph-wasm** | Keeps mobile bundle lean (~90MB savings), enables caching, centralizes accuracy | LOW |
| **Solito v5 web-first** | `.native.tsx` overrides with web defaults; simplifies bundler config | LOW |
| **Clerk + Supabase native integration** | JWT templates deprecated April 2025; use `accessToken()` pattern | MEDIUM |
| **Stripe (web) + RevenueCat (mobile)** | Unified subscription_tier via webhooks; RevenueCat handles IAP complexity | MEDIUM |
| **NativeWind v4 + Tailwind v3.4** | Universal styling; v5/v4 Tailwind incompatible with NativeWind | LOW |
| **React Native Skia (mobile) + D3.js (web)** | Platform-optimal chart rendering; shared data types only | LOW |
| **Placidus house system only** | Simplifies MVP; most common in Bulgaria; add Koch/Whole Sign later | LOW |

---

## Technology Stack Summary

### Core Stack (Validated)

| Layer | Technology | Version | Confidence |
|-------|------------|---------|------------|
| Monorepo | Turborepo | 2.x | HIGH |
| Universal Navigation | Solito | 5.x | HIGH |
| Web App | Next.js | 15.x | HIGH |
| Mobile App | Expo SDK | 53+ | HIGH |
| Auth | Clerk | @clerk/clerk-expo 2.2.0+ | HIGH |
| Database | Supabase (PostgreSQL) | 2.x | HIGH |
| ORM | Drizzle | 0.35.x+ | HIGH |
| Styling | NativeWind | 4.2.0+ | HIGH |
| Mobile Charts | React Native Skia | 1.x | HIGH |
| Web Charts | D3.js | 7.x | HIGH |
| Astrology Engine | swisseph-wasm | 0.0.2+ | MEDIUM |
| Mobile Payments | RevenueCat | 8.x | HIGH |
| Web Payments | Stripe | latest | HIGH |

### Critical Version Constraints

- **Tailwind CSS v3.4.x** (NOT v4 — incompatible with NativeWind v4)
- **react-native-reanimated 3.16.7+** (required for RN 0.77)
- **Expo SDK 53+ preferred** (SDK 52 needs `experiments.reactCanary: true` for React 19)

---

## Feature Priorities

### MVP (P1) — Launch With

| Feature | Complexity | Why Essential |
|---------|------------|---------------|
| Birth Chart Generation | MEDIUM | Core identity; can't engage without it |
| Daily Personalized Horoscope | LOW | Primary engagement driver (70%+ DAU) |
| AI Oracle (Basic) | HIGH | Core differentiator vs competitors |
| Push Notifications | LOW | Critical retention mechanism |
| Basic Transit Info | MEDIUM | Table stakes (Moon phases, retrogrades) |
| Freemium Paywall | MEDIUM | Revenue validation |
| Bulgarian + English | MEDIUM | Target market + broader reach |

### Post-Validation (P2)

- Compatibility/Synastry (high user demand)
- Multiple Profiles (prerequisite for compatibility)
- Journal Integration (long-term engagement)
- Interactive Chart Visualization (polish)
- Widgets/Apple Watch (platform expectation)

### Future (P3)

- Live Astrologer Chat (operational complexity)
- Tarot Integration (scope creep risk)
- Guided Meditations (content investment)

---

## Critical Pitfalls to Avoid

### Phase 1: Project Setup

| Pitfall | Impact | Prevention |
|---------|--------|------------|
| **React version conflicts** | Cryptic hooks errors, hydration failures | Use `syncpack` to enforce version alignment across packages |
| **Metro resolution failures** | "Unable to resolve module" crashes | Rely on Expo SDK 52+ automatic config; use `--clear` cache |

### Phase 2: Auth + Database

| Pitfall | Impact | Prevention |
|---------|--------|------------|
| **Clerk + Supabase RLS misconfiguration** | Empty results or data leaks | Use `auth.jwt()->>'sub'` not `auth.uid()`; add `role: authenticated` claim |
| **Birth data as non-sensitive** | Privacy breach (Moonly leaked 6M users) | Encrypt at rest, minimize collection, GDPR compliance |

### Phase 3: Astrology Engine

| Pitfall | Impact | Prevention |
|---------|--------|------------|
| **swisseph-wasm filesystem limitation** | Calculations fail for historical dates | Server-side only; validate date ranges; bundle required ephemeris |
| **Timezone handling errors** | Wrong chart positions | Handle DST transitions; store times with timezone info |

### Phase 4: UI Development

| Pitfall | Impact | Prevention |
|---------|--------|------------|
| **NativeWind style cascade** | Styles don't apply on mobile | Text colors on Text components only; explicit light/dark modes |
| **Chart rendering divergence** | Unmaintainable platform-specific code | Accept ~30% divergence; share data types, not rendering code |

### Phase 5: Payments

| Pitfall | Impact | Prevention |
|---------|--------|------------|
| **RevenueCat + Stripe sync failure** | Users pay but get no access | POST to `/receipts` endpoint on Stripe webhook; validate user IDs have no whitespace |
| **App Store IAP rejection** | Launch blocked | Submit IAP products WITH first binary; ensure "Ready to Submit" status |

### Phase 6: AI Integration

| Pitfall | Impact | Prevention |
|---------|--------|------------|
| **Generic content killing retention** | <10% day-7 retention | Generate readings from actual transits to user's natal chart |
| **Negative/anxiety-inducing tone** | Bad reviews (Co-Star problem) | Positive psychology framing; growth-oriented language |

### Phase 7: Launch

| Pitfall | Impact | Prevention |
|---------|--------|------------|
| **Bulgarian localization shallow** | Users detect inauthenticity | Cultural adaptation (head-nod meaning, payment methods, BGN→EUR transition) |
| **Privacy policy missing/buried** | GDPR complaints, App Store rejection | Clear, accessible policy; implement data deletion workflow |

---

## Competitive Positioning

| Gap in Market | Our Approach | Competitor Weakness |
|---------------|--------------|---------------------|
| **Bulgarian language** | Native localization | No major competitor serves Bulgaria |
| **AI done right** | Positive, growth-oriented | Co-Star's AI is negative/anxiety-inducing |
| **Precision + UX** | Swiss Ephemeris + modern design | TimePassages precise but dated; Co-Star modern but inaccurate |
| **Privacy-first** | No contact scraping, clear data policy | Co-Star requires phone number, scrapes contacts |

**Pricing:** €9.99/mo positions competitively (CHANI €12/mo, Sanctuary €20/mo, TimePassages €9.99 unlock)

---

## Technical Debt Prevention

| Pattern to Avoid | Symptom | Prevention |
|------------------|---------|------------|
| Dependency drift | Different React versions | syncpack, renovate bot with grouping |
| Platform sprawl | 100+ `.native.tsx`/`.web.tsx` pairs | Accept 20-30% divergence upfront |
| Auth spaghetti | Custom auth logic scattered | Centralize in `packages/auth` |
| Webhook hell | Ungrouped webhook handlers | Webhook router pattern, unified logging |

---

## Monorepo Structure (Recommended)

```
celestia-ai/
├── apps/
│   ├── web/                    # Next.js 15 (App Router)
│   │   └── app/api/            # WASM calculations, webhooks
│   └── mobile/                 # Expo SDK 53+
├── packages/
│   ├── app/                    # Shared screens, hooks, stores
│   │   └── features/           # Feature modules (auth, chart, daily, journal)
│   ├── db/                     # Drizzle schema + Supabase client
│   ├── astrology/              # Types only (no WASM)
│   ├── ui/                     # NativeWind components
│   ├── api/                    # Shared API types, validators
│   └── config/                 # Shared tsconfig, eslint, tailwind
├── turbo.json
└── pnpm-workspace.yaml
```

---

## Data Model (Core Tables)

| Table | Purpose | Key Fields |
|-------|---------|------------|
| `users` | User accounts | clerk_id, subscription_tier, preferences |
| `charts` | Birth charts | user_id, name, date_time, lat, lon, planet_positions (JSONB) |
| `daily_transits` | Cached calculations | date, planet_positions (JSONB) |
| `journal_entries` | User reflections | user_id, date, content, ai_insight |

**RLS Pattern:**
```sql
CREATE POLICY "Users see own charts" ON charts
FOR SELECT USING ((SELECT auth.jwt()->>'sub') = user_id::text);
```

---

## Success Metrics to Track

| Metric | Target | Why It Matters |
|--------|--------|----------------|
| Day-1 Retention | >40% | Users found initial value |
| Day-7 Retention | >20% | Daily habit forming |
| Push Notification Opt-in | >60% | Retention lever enabled |
| Free → Premium Conversion | >5% | Revenue validation |
| App Store Rating | >4.5 | Organic growth enabler |

---

## Next Steps

1. **Create ROADMAP.md** — Break project into executable phases
2. **Phase 1: Monorepo Setup** — Turborepo + Solito + NativeWind scaffold
3. **Phase 2: Auth + Database** — Clerk + Supabase + Drizzle schema
4. **Phase 3: Astrology Engine** — swisseph-wasm API routes
5. **Phase 4: Core UI** — Birth chart input, daily horoscope display
6. **Phase 5: Payments** — Stripe + RevenueCat integration
7. **Phase 6: AI Oracle** — Gemini/GPT-5 personalized readings
8. **Phase 7: Launch Prep** — App Store submission, Bulgarian localization

---

## Sources Summary

**HIGH Confidence (Official Docs):**
- Solito, Expo, Next.js, Clerk, Supabase, NativeWind, React Native Skia, RevenueCat

**MEDIUM Confidence (Community/Articles):**
- swisseph-wasm (limited docs), Bulgarian market data, astrology app retention benchmarks

**Research Documents:**
- ARCHITECTURE.md — 1,230 lines, system design and patterns
- FEATURES.md — 298 lines, feature priorities and competitor analysis
- PITFALLS.md — 500 lines, risk mitigation strategies
- STACK.md — 511 lines, technology validation and configuration

---

*Synthesis completed: 2026-01-21*
*Ready for roadmap creation via `/gsd:new-milestone`*
