# Celestia AI - Critical Pitfalls & Risk Research

> Research conducted: 2026-01-19
> Stack: Turborepo + Solito (Next.js 15 + Expo SDK 52) + Clerk + Supabase + Drizzle ORM + NativeWind v4 + React Native Skia + D3.js + swisseph-wasm + Stripe + RevenueCat
> Market: Bulgarian premium astrology SaaS

---

## Critical Pitfalls

### 1. React Version Conflicts in Monorepo

**What Goes Wrong:** React gets installed multiple times across packages, causing cryptic hooks errors, hydration failures, or components silently failing.

**Why It Happens:** Turborepo hoists dependencies, but different packages (Next.js 15, Expo SDK 52, Solito) may demand different React versions. React Native Web doesn't yet support React 19.

**How to Avoid:**
- Use `yarn why react` and `yarn why react-dom` regularly
- Pin exact React versions across all packages
- Use [syncpack](https://github.com/JamieMason/syncpack) to enforce version alignment
- For SDK 52 with React 19: set `experiments.reactCanary: true` in app.json, remove react from apps/expo package.json

**Warning Signs:**
- "Invalid hook call" errors
- "Attempted import error: 'hydrate' is not exported from 'react-dom'"
- Components work on one platform but not the other

**Phase to Address:** Phase 1 (Project Setup)

**Confidence:** HIGH - [Solito Compatibility Docs](https://solito.dev/compatibility), [Solito v5 Upgrade Guide](https://solito.dev/v5)

---

### 2. Clerk + Supabase RLS Misconfiguration

**What Goes Wrong:** RLS policies silently fail, returning empty results or allowing unauthorized access. Users can see other users' data or get blocked from their own.

**Why It Happens:**
- Using `auth.uid()` instead of `auth.jwt()->>'sub'` (Clerk uses string IDs, not UUIDs)
- Setting default values as `'requesting_user_id'::text` (literal string) instead of calling the function
- Forgetting to add `"role": "authenticated"` claim in JWT template

**How to Avoid:**
```sql
-- CORRECT: Use Clerk's JWT sub claim
create policy "Users see own charts" on charts
for select using ((select auth.jwt()->>'sub') = user_id::text);

-- WRONG: auth.uid() returns Supabase UUID, not Clerk user ID
```

**Warning Signs:**
- Queries return empty arrays when data exists
- `auth.uid()` returns null or wrong values
- Edge Functions fail with JWT validation errors

**Phase to Address:** Phase 2 (Auth + Database Setup)

**Confidence:** HIGH - [Clerk Supabase Integration Docs](https://clerk.com/docs/guides/development/integrations/databases/supabase), [Supabase RLS with Clerk Discussion](https://github.com/orgs/supabase/discussions/33091)

---

### 3. RevenueCat + Stripe Subscription Sync Failure

**What Goes Wrong:** Web purchases via Stripe don't grant entitlements. Users pay but get no premium access. Subscriptions exist in Stripe but not RevenueCat.

**Why It Happens:** RevenueCat webhooks only work if the receipt *already exists*. You must POST to `/receipts` endpoint first to pair user ID with subscription token. Stripe webhooks alone won't create the association.

**How to Avoid:**
1. On Stripe `checkout.session.completed` webhook, call RevenueCat `POST /receipts` with `app_user_id` and `fetch_token` (Stripe subscription ID)
2. Validate user IDs have no whitespace (a tab character caused days of debugging for one team)
3. Implement 2-hour sync tolerance for cancellation events

**Warning Signs:**
- `CustomerInfo` shows no entitlements after successful Stripe payment
- Stripe dashboard shows active subscription, RevenueCat shows free tier
- Cancellations take hours to reflect

**Phase to Address:** Phase 5 (Payment Integration)

**Confidence:** HIGH - [RevenueCat Stripe Integration Docs](https://www.revenuecat.com/docs/web/integrations/stripe), [RevenueCat Community: Stripe Not Reflecting](https://community.revenuecat.com/third-party-integrations-53/problems-with-revenuecat-not-reflecting-stripe-subscription-and-entitlements-4787)

---

### 4. Metro Resolution Failures in Monorepo

**What Goes Wrong:** Metro bundler can't find packages, app crashes on startup with "Unable to resolve module", or builds work locally but fail in EAS.

**Why It Happens:**
- Hoisted dependencies create phantom dependencies you didn't explicitly declare
- Metro searches for entry point at monorepo root instead of app root
- pnpm workspaces don't work well with EAS Build out of the box

**How to Avoid:**
- Rely on Expo SDK 52's automatic Metro configuration (don't manually override `watchFolders`, `nodeModulesPaths` unless necessary)
- After migrating to SDK 52+, run `npx expo start --clear` to reset Metro cache
- For EAS: consider yarn over pnpm, or publish internal packages to npm

**Warning Signs:**
- "Native runtime is not available" errors
- Works in dev, breaks in EAS Build
- `--reset-cache` temporarily fixes issues

**Phase to Address:** Phase 1 (Project Setup)

**Confidence:** HIGH - [Expo Monorepo Guide](https://docs.expo.dev/guides/monorepos/), [Expo SDK 52 Changelog](https://expo.dev/changelog/2024-11-12-sdk-52)

---

### 5. swisseph-wasm File System Access Limitation

**What Goes Wrong:** Swiss Ephemeris calculations fail for dates outside the bundled ephemeris range (typically 1800-2400), or WASM module fails to load ephemeris files at all.

**Why It Happens:** WASM runs in a sandbox without filesystem access. Ephemeris files must be embedded at compile time via Emscripten virtual filesystem.

**How to Avoid:**
- Use server-side calculation only (your architecture already does this correctly)
- Pre-bundle required ephemeris date ranges
- Add comprehensive validation for input dates
- Consider fallback for dates outside supported range

**Warning Signs:**
- Calculations work for recent dates but fail for historical
- WASM initialization errors in browser console
- Inconsistent results between server and any client-side tests

**Phase to Address:** Phase 3 (Core Astrology Engine)

**Confidence:** MEDIUM - [swisseph-wasm GitHub](https://github.com/prolaxu/swisseph-wasm), [swisseph mailing list](https://groups.io/g/swisseph)

---

### 6. NativeWind v4 Style Cascade Failures

**What Goes Wrong:** Styles don't apply, especially text colors on View components, dark mode conditionals fail, or styles work initially then break on hot reload.

**Why It Happens:**
- React Native doesn't cascade styles like CSS web
- `<View className="text-red-500">` does nothing - color must be on Text
- Conditional styles (like dark mode only) cause React Native bugs
- Hot reload has known issues with newly added classes

**How to Avoid:**
```tsx
// WRONG: View doesn't accept text color
<View className="text-red-500"><Text>Hello</Text></View>

// CORRECT: Apply text styles to Text
<View><Text className="text-red-500">Hello</Text></View>

// WRONG: Dark-only conditional
<Text className="dark:text-white">

// CORRECT: Explicit both modes
<Text className="text-black dark:text-white">
```

**Warning Signs:**
- Styles work on web but not mobile
- Need to restart server to see new styles
- `verifyInstallation()` reports issues

**Phase to Address:** Phase 4 (UI Development)

**Confidence:** HIGH - [NativeWind Troubleshooting](https://www.nativewind.dev/docs/getting-started/troubleshooting), [NativeWind GitHub Issues](https://github.com/nativewind/nativewind/issues/1182)

---

### 7. App Store Rejection for Subscription Apps

**What Goes Wrong:** Apple rejects app for subscription-related issues. App works in Sandbox/TestFlight but fails during review. IAP products show empty.

**Why It Happens:**
- Products in "Missing Metadata" state won't work in TestFlight or review
- First app release: IAP products must be submitted WITH the app, not separately
- INVALID_RECEIPT errors when Apple sandbox is having issues
- Privacy policy link missing or inaccessible

**How to Avoid:**
- Ensure all IAP products are "Ready to Submit" or "Approved" before submission
- For new apps, submit IAP products along with first binary
- Include restore purchases button prominently
- Test all 3 environments: Production, TestFlight, Sandbox

**Warning Signs:**
- Offerings empty in release but populated in debug
- Rejection feedback mentions "cannot complete purchase"
- Products stuck in "Missing Metadata"

**Phase to Address:** Phase 5 (Payment) + Phase 7 (App Store Submission)

**Confidence:** HIGH - [RevenueCat Launch Checklist](https://www.revenuecat.com/docs/test-and-launch/launch-checklist), [RevenueCat App Store Rejections](https://www.revenuecat.com/docs/app-store-rejections)

---

### 8. Generic Astrology Content Killing Retention

**What Goes Wrong:** Users download, try for a day, never return. High acquisition cost with <10% day-7 retention. Bad reviews mention "same as every other app."

**Why It Happens:**
- Copy-pasted, generic horoscopes without real personalization
- Failing to use actual birth chart data in daily readings
- No reason to return daily (missing engagement hooks)
- A single calculation error destroys trust permanently

**How to Avoid:**
- Generate readings based on actual transits to user's natal chart
- Implement daily streaks, push notifications for significant transits
- Quality-test astrological accuracy with practicing astrologers
- Build "trust signals": show calculation sources, explain methodology

**Warning Signs:**
- Retention metrics drop sharply after day 1
- User reviews mention "generic" or "could be for anyone"
- No difference between free and premium content depth

**Phase to Address:** Phase 3 (Astrology Engine) + Phase 6 (AI Integration)

**Confidence:** HIGH - [Why Most Astrology Apps Fail](https://vocal.media/humans/why-most-astrology-apps-fail-and-how-to-build-one-users-actually-trust), [JPLoft: 10 Reasons Astrology Startups Fail](https://www.jploft.com/blog/why-astrology-startups-fail)

---

### 9. Birth Data Privacy Violations

**What Goes Wrong:** Data breach exposes users' birth dates, times, exact locations. GDPR complaints. Public backlash. Moonly leaked 6 million users' data in 2023.

**Why It Happens:**
- Birth data = PII (personally identifiable information)
- Astrology apps uniquely collect birth time + exact location together
- Third-party analytics/advertising SDKs exfiltrating data
- Inadequate encryption or access controls

**How to Avoid:**
- Minimize data collection (do you really need exact birth time for all features?)
- Encrypt birth data at rest and in transit
- Never share birth data with advertising networks
- GDPR compliance: right to access, correct, delete
- Regular security audits
- Clear, accessible privacy policy

**Warning Signs:**
- Analytics dashboards showing personal data
- No data deletion workflow implemented
- Privacy policy buried or vague about data sharing

**Phase to Address:** Phase 2 (Database) + Phase 7 (Compliance)

**Confidence:** HIGH - [Surfshark: Astrology Apps Privacy](https://surfshark.com/research/chart/astrology-apps-privacy), [The Outline: Horoscope App Privacy](https://theoutline.com/post/4185/mercury-retrograde-horoscope-app-scamming-privacy-policy-data)

---

### 10. Universal Codebase Becoming Unmaintainable

**What Goes Wrong:** The dream of 90% code sharing becomes 50% shared code + 50% platform-specific hacks. Mobile roadmap stalls while web iterates quickly. Eventually team considers splitting codebases.

**Why It Happens:**
- Forcing web patterns onto mobile or vice versa
- Abstracting too early before understanding platform differences
- Chart rendering (Skia vs D3/Canvas) fundamentally different
- Navigation paradigms differ (tabs/stacks vs URLs)

**How to Avoid:**
- Accept that some code SHOULD be platform-specific (charts, navigation shells)
- Use Solito's "app shells decide navigation, screens stay agnostic" philosophy
- Don't abstract until you've built the feature twice
- Budget 20-30% for platform-specific code from the start

**Warning Signs:**
- Many `.native.tsx` and `.web.tsx` files for same component
- Constant "works on web, broken on mobile" bugs
- Developers dreading cross-platform PRs

**Phase to Address:** Phase 1 (Architecture) + Ongoing

**Confidence:** HIGH - [Paisanos: Universal App Case Study](https://www.paisanos.io/blog/the-universal-way-one-codebase-all-platforms), [Theodo: State of React Native Web Apps](https://blog.theodo.com/2023/05/react-native-single-codebase/)

---

## Technical Debt Patterns

| Pattern | Symptom | Root Cause | Prevention | Refactor Cost |
|---------|---------|------------|------------|---------------|
| Dependency Drift | Different React versions across packages | No version pinning strategy | syncpack, renovate bot with grouping | MEDIUM |
| Platform Sprawl | 100+ `.native.tsx`/`.web.tsx` pairs | Over-abstracting too early | Accept 20-30% divergence, abstract later | HIGH |
| Auth Spaghetti | Custom auth logic scattered everywhere | Not using Clerk hooks consistently | Centralize in `packages/auth` | HIGH |
| ORM Bypass | Raw SQL mixed with Drizzle queries | Quick fixes, RLS complexity | Strict code review, lint rules | MEDIUM |
| Style Inconsistency | Mixed inline styles, NativeWind, StyleSheet | Multiple developers, no convention | Style guide, ESLint plugin | LOW-MEDIUM |
| Webhook Hell | Stripe + RevenueCat + Clerk webhooks ungrouped | Organic growth | Webhook router pattern, unified logging | MEDIUM |
| Test Debt | Only happy-path tests | Time pressure | Require edge case tests for payments/auth | HIGH |

---

## Integration Gotchas

### Clerk

| Gotcha | Impact | Solution |
|--------|--------|----------|
| JWT template deprecated (April 2025) | Future breaking change | Migrate to native Supabase integration |
| Mobile token refresh timing | Auth failures mid-session | Implement token refresh interceptor |
| Biometric auth state sync | User locked out | Test re-auth flows extensively |

**Source:** [Clerk Supabase Docs](https://clerk.com/docs/guides/development/integrations/databases/supabase)

### Supabase

| Gotcha | Impact | Solution |
|--------|--------|----------|
| RLS + Drizzle: forgetting to set JWT | Queries return empty | Always verify `auth.jwt()` is populated |
| Transaction pool mode + prepared statements | Query failures | Set `prepare: false` in postgres client |
| Realtime subscriptions + RLS | Missed updates | Test subscription filtering carefully |

**Source:** [Drizzle + Supabase Tutorial](https://orm.drizzle.team/docs/tutorials/drizzle-with-supabase)

### Stripe

| Gotcha | Impact | Solution |
|--------|--------|----------|
| Webhook signature verification in serverless | 400 errors, missed events | Use raw body, not parsed JSON |
| Test mode vs Live mode API keys | Production purchases fail | Environment-specific key management |
| Bulgarian VAT handling | Tax calculation errors | Use Stripe Tax or manual VAT logic |

### RevenueCat

| Gotcha | Impact | Solution |
|--------|--------|----------|
| Only one Stripe integration per project | Can't test in sandbox mode easily | Use separate RevenueCat projects for dev/prod |
| 2-hour delay for cancellation sync | User confusion | Show "pending cancellation" state |
| User ID with whitespace | Entitlements not granted | Trim and validate all user IDs |

**Source:** [RevenueCat Stripe Integration](https://www.revenuecat.com/docs/web/integrations/stripe)

### swisseph-wasm

| Gotcha | Impact | Solution |
|--------|--------|----------|
| Ephemeris file date range limits | Calculations fail for historical dates | Validate dates, show user-friendly errors |
| WASM initialization async | Race conditions | Await initialization before calculations |
| Memory usage with many calculations | Mobile performance issues | Batch calculations, run server-side only |

---

## Performance Traps

### 1. SVG Charts on Mobile
**Trap:** Using react-native-svg for dynamic charts causes frame drops.
**Solution:** Use React Native Skia for mobile charts, keep D3 calculations but render with Skia paths.
**Source:** [Victory Native Skia Migration](https://github.com/FormidableLabs/victory)

### 2. swisseph-wasm in Bundle
**Trap:** Bundling WASM module increases mobile app size and initialization time.
**Solution:** Keep all Swiss Ephemeris calculations server-side via API routes (already in your architecture).

### 3. Unoptimized Supabase Queries
**Trap:** N+1 queries when fetching charts with related data.
**Solution:** Use Drizzle's `with` clause for eager loading, add proper indexes.

### 4. NativeWind JIT Compilation
**Trap:** First render slow due to style compilation.
**Solution:** Pre-generate critical styles, use `verifyInstallation()` to catch issues.

### 5. Realtime Subscription Overload
**Trap:** Too many Supabase realtime channels open simultaneously.
**Solution:** Consolidate subscriptions, clean up on unmount, use presence sparingly.

---

## Security Mistakes Specific to Astrology Apps

### Birth Data is PII
- **Mistake:** Treating birth date/time/location as non-sensitive
- **Reality:** This data can uniquely identify individuals, used for identity verification
- **Fix:** Encrypt at rest, minimize collection, clear data retention policy

### Partner/Family Data Exposure
- **Mistake:** Synastry features exposing other people's birth data
- **Reality:** User may input data for people who haven't consented
- **Fix:** Consent flows, data minimization, no sharing without explicit approval

### Overly Permissive API
- **Mistake:** API returns full chart data including birth time to any authenticated user
- **Reality:** Enables data scraping
- **Fix:** Rate limiting, field-level permissions, audit logging

### Analytics Leakage
- **Mistake:** Sending birth data to analytics/crash reporting
- **Reality:** Third parties now have your users' PII
- **Fix:** Scrub PII before sending to any third party, audit SDK data flows

---

## UX Pitfalls for Astrology Apps

### 1. Onboarding Birth Time Friction
**Problem:** Requiring exact birth time immediately causes 60%+ drop-off.
**Solution:** Make birth time optional initially, show what features unlock with it.

### 2. Overwhelming Chart Complexity
**Problem:** Showing full natal chart to beginners causes confusion and abandonment.
**Solution:** Progressive disclosure - start with sun/moon/rising, reveal more over time.

### 3. Notification Spam
**Problem:** Daily push notifications without value train users to ignore or uninstall.
**Solution:** Only notify for genuinely significant transits to user's chart.

### 4. Paywall Before Value
**Problem:** Showing premium gate before user understands app's value.
**Solution:** Let users see personalized insights first, paywall deeper features.

### 5. Cultural Localization for Bulgaria
**Problem:** Direct translation without cultural adaptation.
**Solution:**
- Bulgarian head-nod means "no" (affects any animation/UX cues)
- Consider older users without bank accounts (family member payment flows)
- Support local payment methods (ePay.bg alongside Stripe)
- Bulgaria joined eurozone Jan 2026 - support both BGN history and EUR

**Source:** [Glopal: Selling in Bulgaria](https://merchants.glopal.com/en-us/sell-online/bulgaria)

---

## "Looks Done But Isn't" Checklist

### Authentication
- [ ] Clerk session refresh works after app backgrounded for hours
- [ ] Biometric re-auth after failed attempts
- [ ] Account deletion actually removes all user data (GDPR)
- [ ] Logout clears all local storage/secure storage
- [ ] Deep links work when user is logged out

### Payments
- [ ] Subscription state syncs correctly across web and mobile
- [ ] Restore purchases works on fresh install
- [ ] Grace period handling for failed payments
- [ ] Refund webhook revokes access
- [ ] Family sharing handled (iOS)
- [ ] Upgrade/downgrade proration correct
- [ ] Receipts validated server-side, not just client

### Astrology Engine
- [ ] Timezone handling for birth charts (not just UTC)
- [ ] Southern hemisphere house systems correct
- [ ] Edge cases: birth at midnight, date line, polar regions
- [ ] Historical dates (pre-1900) handled or gracefully rejected
- [ ] Daylight saving time transitions handled

### Cross-Platform
- [ ] Keyboard avoidance works on both platforms
- [ ] Safe area insets on notched devices
- [ ] Pull-to-refresh feels native on both platforms
- [ ] Back button/gesture works correctly on Android
- [ ] iPad/tablet layouts not broken

### Performance
- [ ] App startup < 3 seconds on mid-range device
- [ ] Chart renders at 60fps during interaction
- [ ] Offline mode shows cached data
- [ ] Background fetch updates daily horoscope

---

## Pitfall-to-Phase Mapping

| Phase | Critical Pitfalls to Address |
|-------|------------------------------|
| **Phase 1: Setup** | React version conflicts, Metro resolution, monorepo architecture decisions |
| **Phase 2: Auth + DB** | Clerk-Supabase RLS, Drizzle migration issues, data encryption |
| **Phase 3: Astrology** | swisseph-wasm limitations, calculation accuracy, timezone handling |
| **Phase 4: UI** | NativeWind gotchas, Skia vs D3 chart divergence, responsive design |
| **Phase 5: Payments** | RevenueCat-Stripe sync, webhook configuration, subscription state |
| **Phase 6: AI** | Generic content, personalization depth, API costs |
| **Phase 7: Launch** | App Store rejection, privacy compliance, Bulgarian localization |
| **Ongoing** | Technical debt patterns, universal codebase maintenance |

---

## Sources & Confidence Levels

### HIGH Confidence (Official docs, multiple confirming sources, community consensus)
- [Solito Documentation](https://solito.dev/) - Universal app architecture
- [Expo SDK 52 Monorepo Guide](https://docs.expo.dev/guides/monorepos/) - Metro configuration
- [Clerk Supabase Integration](https://clerk.com/docs/guides/development/integrations/databases/supabase) - Auth setup
- [RevenueCat Launch Checklist](https://www.revenuecat.com/docs/test-and-launch/launch-checklist) - Payment integration
- [NativeWind Troubleshooting](https://www.nativewind.dev/docs/getting-started/troubleshooting) - Styling issues
- [Surfshark Astrology App Privacy Research](https://surfshark.com/research/chart/astrology-apps-privacy) - Data privacy

### MEDIUM Confidence (Single authoritative source, some community validation)
- [Why Most Astrology Apps Fail](https://vocal.media/humans/why-most-astrology-apps-fail-and-how-to-build-one-users-actually-trust) - Market insights
- [Theodo: React Native Single Codebase](https://blog.theodo.com/2023/05/react-native-single-codebase/) - Universal app challenges
- [Drizzle + Supabase Tutorial](https://orm.drizzle.team/docs/tutorials/drizzle-with-supabase) - ORM integration
- [Bulgarian eCommerce Guide](https://merchants.glopal.com/en-us/sell-online/bulgaria) - Market localization

### LOW Confidence (Limited sources, may need verification)
- swisseph-wasm performance characteristics (limited production reports)
- Bulgarian astrology app market size (extrapolated from general market data)
- Specific retention benchmarks for astrology category

---

*This document should be reviewed and updated as development progresses. Mark items as resolved or add new findings as discovered.*
