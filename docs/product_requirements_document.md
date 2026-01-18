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

### 3.1. Astronomical Engine
-   **Swiss Ephemeris Integration**:
    -   Backend uses `swisseph-wasm` for high-precision calculations.
    -   Calculates: Natal Charts, Transits, Progressions, Solar Returns.
    -   **Local Focus**: Precise coordinates for all Bulgarian cities/villages.

### 3.2. AI-Powered Readings (Localized)
-   **The "Oracle" Engine**:
    -   **Context Injection**: Planetary aspects interpreted with a tone that respects local cultural wisdom (supportive, insightful, not overly "pop-astrology").
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
    -   **Free**: Basic Natal Chart, Daily General Horoscope.
    -   **Premium (€7.99/mo)**: Interactive Transits, AI Oracle (limited), Detailed Aspect Analysis.
    -   **Pro (€14.99/mo)**: Synastry, Solar Returns, Unlimited AI.
-   **Payment Gateway**:
    -   **Stripe**: Primary handler.
    -   **In-App Purchases (IAP)**: RevenueCat integration for Apple/Google subscriptions (required for native apps).

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
-   *Deferred to Phase 2 per user request.* Focus strictly on personal utility and accuracy for MVP.

---
*Prepared by Antigravity (Google Deepmind)*
