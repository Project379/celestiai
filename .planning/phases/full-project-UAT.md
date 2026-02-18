---
status: testing
phase: full-project (1-8)
source: 01-01-SUMMARY.md, 01-02-SUMMARY.md, 01-03-SUMMARY.md, 02-01-SUMMARY.md, 02-02-SUMMARY.md, 02-03-SUMMARY.md, 03-01-SUMMARY.md, 03-02-SUMMARY.md, 03-03-SUMMARY.md, 03-04-SUMMARY.md, 03-05-SUMMARY.md, 03.1-01-SUMMARY.md, 03.1-02-SUMMARY.md, 03.1-03-SUMMARY.md, 04-01-SUMMARY.md, 04-02-SUMMARY.md, 04-03-SUMMARY.md, 04-04-SUMMARY.md, 05-01-SUMMARY.md, 05-02-SUMMARY.md, 05-03-SUMMARY.md, 06-01-SUMMARY.md, 06-02-SUMMARY.md, 06-03-SUMMARY.md, 07-01-SUMMARY.md, 07-02-SUMMARY.md, 07-03-SUMMARY.md, 08-01-SUMMARY.md, 08-02-SUMMARY.md, 08-03-SUMMARY.md
started: 2026-02-19T12:00:00Z
updated: 2026-02-19T12:00:00Z
---

## Current Test
<!-- OVERWRITE each test - shows where we are -->

number: 1
name: Landing Page with Starfield and Navigation
expected: |
  Navigate to the root URL (localhost:3000). You should see:
  - Animated starfield background with twinkling stars
  - "Celestia AI" title with gradient styling
  - Bulgarian motto/tagline text
  - Sticky navigation bar with tabs: Функции, Цени, За нас
  - "Вход" (login) and CTA buttons linking to /auth
  - Scrollable sections: Features, Pricing, About
  - Footer with privacy policy link to /privacy
awaiting: user response

## Tests

### 1. Landing Page with Starfield and Navigation
expected: Navigate to root URL. See animated starfield, "Celestia AI" gradient title, Bulgarian motto, sticky nav with Функции/Цени/За нас tabs, login/CTA buttons to /auth, scrollable sections, footer with /privacy link.
result: [pending]

### 2. Feature Cards with Icons and Premium Badges
expected: Scroll to Features section. See 4 feature cards in 2x2 grid with Lucide icons (Star, Sparkles, Calendar, Bell). AI Oracle and Daily Horoscope cards show "Премиум" badge. All text in Bulgarian.
result: [pending]

### 3. Pricing Section on Landing
expected: Scroll to Pricing section. See Free vs Premium comparison cards. Premium shows price in Bulgarian leva. CTA buttons link to /auth or /pricing.
result: [pending]

### 4. Auth Page with Cosmic Background
expected: Navigate to /auth. See animated cosmic background with twinkling stars and nebula glow. Celestia AI branding header with Bulgarian tagline. Clerk sign-in form with Bulgarian localization. Purple/violet themed form elements.
result: [pending]

### 5. Sign Up and Email Verification
expected: On /auth page, switch to sign-up mode. Register with email and password. Receive verification email. Complete signup flow. All Clerk UI elements in Bulgarian.
result: [pending]

### 6. Protected Route Redirect
expected: While logged out, try to navigate to /dashboard directly. You should be redirected to /auth. Same for /chart, /settings, /birth-data.
result: [pending]

### 7. Dashboard with Dark Theme
expected: After logging in, you land on /dashboard. See dark glassmorphism theme (#0a0819 deep space background). Welcome message with your name. User menu in header with avatar.
result: [pending]

### 8. Logout Confirmation Dialog
expected: Click your avatar in the header to open UserButton menu. Click "Изход" (Logout). A confirmation dialog appears: "Сигурни ли сте, че искате да излезете?" with Confirm/Cancel buttons. Cancel dismisses. Confirm logs you out and redirects to /.
result: [pending]

### 9. Birth Data Wizard - Full Flow
expected: On dashboard (no birth data yet), see CTA card prompting you to enter birth data. Click it to go to /birth-data. 4-step wizard appears with progress bar: Step 1 (name + date), Step 2 (time known/unknown toggle + time input), Step 3 (city search), Step 4 (confirmation). Complete all steps and submit.
result: [pending]

### 10. City Search Autocomplete
expected: In the birth data wizard Step 3, type "Со" in the city search field. After brief delay (~300ms), dropdown appears with Bulgarian cities starting with "Со" (e.g., София). Cities sorted: cities first, then towns, then villages. Select a city - coordinates auto-populate.
result: [pending]

### 11. Birth Data Card on Dashboard
expected: After submitting birth data, you're redirected to /dashboard. See a BirthDataCard showing your name, birth date, time (or "неизвестно" if unknown), and city. Edit button visible.
result: [pending]

### 12. Edit Birth Data with Confirmation
expected: Click edit on BirthDataCard. Dialog opens with pre-populated form. Change a field (e.g., name). Click save. Confirmation step appears ("Сигурни ли сте?"). Confirm to save. Card updates with new data.
result: [pending]

### 13. Natal Chart Visualization
expected: Navigate to /chart. See D3.js natal chart wheel with 12 zodiac segments colored by element (Fire/Earth/Air/Water). All 10 planets positioned on the wheel with Bulgarian 2-letter abbreviations. Aspect lines between planets (colored by type). Loading skeleton shown while calculating.
result: [pending]

### 14. Big Three Cards
expected: On /chart page, see Big Three cards prominently displayed: Sun (Слънце), Moon (Луна), Rising (Асцендент). Each card shows zodiac sign in Bulgarian with trait keywords. If birth time unknown, Rising shows "~" prefix with disclaimer.
result: [pending]

### 15. Planet Click Interpretation
expected: Click any planet on the natal wheel. A glassmorphism interpretation panel slides up showing: planet name, position (degree + sign), Bulgarian trait text, and placeholder interpretation. Press Escape to close. Also works by clicking Big Three cards.
result: [pending]

### 16. Chart Keyboard Accessibility
expected: On /chart page, use Tab to focus planets on the wheel. Focused planet shows visual indicator. Press Enter or Space to select a planet - interpretation panel opens. Press Escape to close.
result: [pending]

### 17. Oracle Topic Cards
expected: On /chart page, see Oracle section with 4 topic cards: Личност (general), Любов (love), Кариера (career), Здраве (health). General topic is available (no lock icon). Premium topics show lock icon for free users.
result: [pending]

### 18. AI Oracle General Reading
expected: Click the Личност (general/personality) topic card. Streaming text begins with pulsing "Celestia консултира звездите..." loading state. Reading streams in Bulgarian, citing specific degree positions (e.g., "Вашето Слънце на 15 градуса Лъв..."). Planet names in reading are highlighted with accent colors.
result: [pending]

### 19. Oracle Locked Premium Topics
expected: As a free user, click a premium topic (Любов/Кариера/Здраве). Instead of a reading, see blurred teaser text with glassmorphism upgrade CTA overlay. CTA links to pricing/checkout.
result: [pending]

### 20. Daily Horoscope Card
expected: On /dashboard, see DailyHoroscope card (after BirthDataCard section). Shows today's personalized horoscope with streaming text. Planet names highlighted with accent colors. Today/Yesterday tab navigation visible.
result: [pending]

### 21. Yesterday Horoscope Navigation
expected: On the DailyHoroscope card, click "Вчера" (Yesterday) tab. If you visited yesterday, shows that day's horoscope. If not, shows "Не е наличен" (not available) message. Click "Днес" (Today) to return.
result: [pending]

### 22. Push Notification Banner
expected: Below the DailyHoroscope card on dashboard, see PushNotificationBanner with Bulgarian text offering to enable notifications. Click subscribe button. Browser permission prompt appears. After allowing, banner changes to show unsubscribe option.
result: [pending]

### 23. Pricing Page
expected: Navigate to /pricing. See side-by-side Free/Premium cards (stacked on mobile). Free card lists 3 features. Premium card lists 6 features. Monthly/annual toggle with savings badge (~17% спестявате when annual selected). Premium card has "Отключи Премиум" checkout button.
result: [pending]

### 24. Stripe Checkout Flow
expected: On /pricing, click "Отключи Премиум". Redirected to Stripe checkout page. Complete payment with test card (4242 4242 4242 4242). Redirected to /subscription/success. See activating state with cosmic spinner, then celebration message "Добре дошли в Celestia Премиум!".
result: [pending]

### 25. Settings Page - Subscription Management
expected: Navigate to /settings. See subscription section showing current plan status. For premium users: active badge, next billing date, payment method info, "Управление на плащания" (manage payments) button, cancel button. For free users: plan name with upgrade CTA.
result: [pending]

### 26. Cancel Subscription Flow
expected: On /settings as premium user, click cancel button. Native dialog appears with optional reason dropdown (4 options in Bulgarian). Confirm cancellation. Status changes to "Cancelling" with amber badge and expiry date. "Реактивирай" (Reactivate) button appears.
result: [pending]

### 27. Upgrade Prompts for Free Users
expected: As a free user on /dashboard, see UpgradePrompt inline after birth data section. Clicking it expands to show pricing and checkout button. Also visible after daily horoscope content. Premium users see no upgrade prompts.
result: [pending]

### 28. Privacy Policy Page
expected: Navigate to /privacy (public, no auth needed). See comprehensive Bulgarian GDPR privacy policy text covering: data collection, usage, storage, user rights, cookies, and contact info. Accessible from landing page footer link.
result: [pending]

### 29. Privacy Settings - Data Export
expected: Navigate to /settings/privacy. Click data export button. JSON file downloads containing all your personal data (birth data, charts, readings, horoscopes). File is properly formatted.
result: [pending]

### 30. Privacy Settings - Account Deletion
expected: On /settings/privacy, click account deletion button. Confirmation dialog appears warning about 30-day grace period. Confirm deletion. Account marked for deletion with scheduled date 30 days out. Can cancel deletion before grace period ends.
result: [pending]

### 31. Security Headers
expected: Open browser DevTools > Network tab. Load any page. Check response headers. Should see: Content-Security-Policy, X-Frame-Options: DENY, X-Content-Type-Options: nosniff, Referrer-Policy: strict-origin-when-cross-origin, Strict-Transport-Security.
result: [pending]

### 32. Responsive Layout
expected: Resize browser to mobile width (~375px). Landing page: nav tabs hidden, sections stack vertically. Dashboard: cards stack vertically. Chart page: Big Three cards above wheel (not beside). Pricing: cards stack vertically. All content readable without horizontal scroll.
result: [pending]

### 33. All Text in Bulgarian
expected: Navigate through all pages (landing, auth, dashboard, chart, pricing, settings, privacy). All user-visible text should be in Bulgarian Cyrillic. No English text in UI elements (buttons, labels, headings, descriptions). Clerk UI elements also in Bulgarian.
result: [pending]

## Summary

total: 33
passed: 0
issues: 0
pending: 33
skipped: 0

## Gaps

[none yet]
