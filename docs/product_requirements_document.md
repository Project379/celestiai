# Product Requirements Document (PRD): Celestia AI

**Version:** 1.0  
**Date:** January 18, 2026  
**Status:** Draft / Review Required

## 1. Executive Summary
**Celestia AI (BG Edition)** is a premium, subscription-based astrology application designed for the Bulgarian market. It harmonizes rigorous astronomical accuracy (Swiss Ephemeris) with the deep spiritual heritage of the region (Petar Dunov/White Brotherhood influence), utilizing state-of-the-art AI for hyper-personalized, culturally resonant readings.

## 2. Core Value Proposition
-   **Scientific & Spiritual**: Bridging NASA-level precision with the intuitive wisdom valued in Bulgarian culture.
-   **Localized Experience**: Fully available in Bulgarian (Cyrillic) and English.
-   **AI-Powered Insight**: "The Oracle" engine calibrated to providing empathetic, nuanced guidance compatible with local spiritual sensibilities.

## 3. Product Features

### 3.1. Astronomical Engine (Scientific Grade)
-   **Swiss Ephemeris Integration**:
    -   Backend uses `swisseph-wasm` for high-precision calculations.
    -   **Topocentric Moon**: Corrects for parallax (crucial for exact Moon transit timing).
    -   **True Node**: Uses True North Node (not Mean) for karmic accuracy.
    -   **Exact Aspects**: Distinguishes between "Applying" (building up) and "Separating" (fading) aspects.
    -   **House Systems**: Placidus (Default for BG), Whole Sign, Koch.
    -   **Local Focus**: Precise coordinates for all Bulgarian cities/villages.

### 3.2. AI-Powered Readings (Localized)
-   **The "Oracle" Engine**:
    -   **Context Injection**: Planetary aspects interpreted with a tone that respects local cultural wisdom (supportive, insightful, not overly "pop-astrology").
    -   **Precision Citing**: The AI MUST reference the exact degrees and minutes (e.g., "Sun at 14°32' Leo") to ground the advice in data.
    -   **Language**: Native-level Bulgarian text generation via Gemini/GPT-5.

### 3.3. User Experience & Interface
-   **Visual Style**: "Cosmic Glassmorphism". Deep dark backgrounds, suitable for modern OLED screens favored in 2026.
-   **Interactive Star Chart**: D3.js/Canvas celestial sphere.
-   **Navigation**: Bottom Navigation Bar (Home, Chart, Oracle, Profile).

### 3.4. Mobile Apps (iOS / Android)
-   **Native Experience**: Built with **React Native (Expo)** for truly native performance and look-and-feel.
-   **Shared Core**: 90% code sharing with Web App via **Solito** (Universal React).
-   **Mobile Exclusives**: Haptic feedback on transit crossings, daily push notifications for "Cosmic Weather".
-   **Visualization**: **React Native Skia** for 60fps+ interactive star charts (best-in-class performance).

### 3.5. Subscription & Monetization (EUR - 2026)
*Bulgaria adopts Euro Jan 1, 2026*
-   **Freemium Model**:
    -   **Free**: Basic Natal Chart, Daily General Horoscope, **Ad-Supported**.
    -   **Premium (€9.99/mo)**: Ad-Free, Interactive Transits, Unlimited AI Oracle, Deep Analysis, Synastry.
-   **Payment Gateway**:
    -   **Stripe**: Primary handler.
    -   **In-App Purchases (IAP)**: RevenueCat integration.
-   **Ads Integration**:
    -   Non-intrusive native ads in the feed for free users.

## 4. Technical Architecture

### 4.1. Stack Recommendation: The "Universal" Monorepo - 2026 Edition
-   **Monorepo Manager**: **Turborepo** (State of Art).
-   **Code Sharing**: **Solito** (Next.js + Expo Router).
-   **Auth**: **Clerk** (Selected for "Better Auth").
    -   Handles Web (Cookies) + Native (Tokens/Biometrics) seamlessly.
    -   Social Login (Apple/Google) out-of-the-box.
-   **Database**: **Supabase** (PostgreSQL).
    -   Selected over Neon for built-in **Realtime** (needed for "Live Transit" features later).
    -   Row Level Security (RLS) for privacy.
-   **Backend Logic**: Next.js API Routes (Serverless) acting as the secure gateway.
-   **Visualization**:
    -   Mobile: **React Native Skia** (GPU).
    -   Web: **D3.js + Canvas**.

## 5. Development Roadmap (Phase 1: MVP)
1.  **Setup**: Initialize `create-solito-app` + `clerk` + `supabase`.
2.  **Shared Logic**: `packages/astrology` (The Engine).
3.  **Auth**: Configure Clerk for "Universal" session sharing.
4.  **Database**: Defined Supabase Schema (Users, Charts, Subscriptions).
5.  **UI**: Build "Cosmic" Theme with `NativeWind`.
6.  **Core Features**: Interactive Chart (Skia/Canvas).
7.  **Payments**: Stripe (Web) + RevenueCat (Mobile).
8.  **Launch**: Web + TestFlight.

## 6. Social Features
### 3.6. Engagement & Social (New)
-   **Daily Streak System**:
    -   Visual "Fire/Star" counter for consecutive daily readings.
    -   Gamification: Unlock "Cosmic Insights" or badges for 7/30/100 day streaks.
-   **Shareable Quote of the Day**:
    -   AI-generated, personalized spiritual quote based on daily transits.
    -   **One-Tap Share**: Generates a beautiful "Instagram Story" ready image (background: cosmic glassmorphism) with the quote and branding.
    -   **Incentive**: Unlock extra detail for the day if shared (optional growth loop).

---
*Prepared by Antigravity (Google Deepmind)*
