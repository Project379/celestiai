# FIGMA.md — Stellaeum AI Design System Rules for Figma MCP Integration

This document guides Claude Code when translating Figma designs into Stellaeum AI code using the Figma MCP server.

---

## 1. Token Definitions

### Source of Truth

CSS variables live in **`apps/web/app/globals.css`** inside the `:root` block. Tailwind aliases live in **`apps/web/tailwind.config.ts`**.

### Color Tokens (RGB triplets — no `rgb()` wrapper)

```css
/* apps/web/app/globals.css */
--color-background:    3 7 18;       /* #030712 — page background */
--color-surface:       12 18 35;     /* #0c1223 — card/panel surface */
--color-surface-glass: 20 28 50;     /* #141c32 — glassmorphism layer */
--color-primary:       34 211 238;   /* #22d3ee — cyan accent */
--color-secondary:     251 191 36;   /* #fbbf24 — gold accent */
--color-text:          226 232 240;  /* slate-200 — body text */
--color-text-muted:    148 163 184;  /* slate-400 — secondary text */
```

> **Critical:** Variables store bare RGB triplets so Tailwind can compose `rgb(var(--color-X) / <alpha-value>)` for opacity variants (e.g., `bg-primary/20`). Never wrap the value in `rgb()` in globals.css.

### Glassmorphism Tokens

```css
--glass-blur:    16px;
--glass-opacity: 0.12;
--glass-border:  rgba(200, 220, 255, 0.08);
--gradient-cosmic: linear-gradient(135deg, rgb(34, 211, 238) 0%, rgb(251, 191, 36) 100%);
```

### Tailwind Semantic Names (use these in className)

| Tailwind class   | Maps to                  |
|------------------|--------------------------|
| `bg-background`  | `--color-background`     |
| `bg-surface`     | `--color-surface`        |
| `bg-surface-glass` | `--color-surface-glass` |
| `bg-primary`     | `--color-primary`        |
| `bg-secondary`   | `--color-secondary`      |
| `text-foreground`| `--color-text`           |
| `text-muted`     | `--color-text-muted`     |
| `backdrop-blur-glass` | `--glass-blur` (16px) |

### No Token Pipeline

There is no Style Dictionary, design token JSON, or token transformation system. All tokens are hand-authored CSS variables referenced directly. Do not create token config files.

---

## 2. Typography

### Fonts (loaded via `next/font/google` in `apps/web/app/layout.tsx`)

| CSS Variable      | Font     | Weights   | Use                                    |
|-------------------|----------|-----------|----------------------------------------|
| `--font-display`  | Manrope  | 400–800   | All headings, UI text (Cyrillic+Latin) |
| `--font-body`     | Inter    | variable  | Body text                              |
| `--font-cinzel`   | Cinzel   | 400,600,700 | Brand mark "CELESTIA", Roman numerals — **Latin only** |

> **Important:** Cinzel cannot render Cyrillic. Use `font-display` (Manrope) for any Bulgarian text headings.

### Global Heading Defaults (`globals.css`)

All `h1–h4` default to `var(--font-display)`. To apply in Tailwind:

```tsx
// Heading
<h2 className="font-display text-2xl font-semibold text-foreground">…</h2>

// Body
<p className="font-body text-base text-muted">…</p>

// Brand / Roman numerals only
<span className="font-cinzel text-sm tracking-widest text-secondary">CELESTIA</span>
```

### Responsive Type Scale

```tsx
// Common pattern in landing sections
<h1 className="text-4xl md:text-6xl font-display font-bold">…</h1>

// Dashboard headings
<h2 className="text-xl md:text-2xl font-display font-semibold">…</h2>
```

---

## 3. Component Architecture

### Shared Package: `@stellaeum/ui`

Located at `packages/ui/`. Contains only two primitives — use these for marketing/landing pages:

```tsx
import { GlassCard, Text } from '@stellaeum/ui'

// GlassCard applies: bg-surface-glass/15 backdrop-blur-glass border border-white/10 rounded-2xl p-6 shadow-xl
<GlassCard>…</GlassCard>

// Text with variant
<Text variant="h2">…</Text>      // variants: h1 | h2 | h3 | body | muted
```

> `GlassCard` is used **only in landing/marketing pages**. The authenticated dashboard uses inline Tailwind classes directly — do not backport `GlassCard` into dashboard components.

### App Components: `apps/web/components/`

Feature-grouped. When adding Figma-derived components, place them in the matching feature folder:

```
components/
├── auth/          — auth forms, user menu, modals
├── birth-data/    — wizard, city search, edit dialogs
├── chart/         — natal wheel (D3), planet cards, legend
├── dashboard/     — dashboard layout/content
├── horoscope/     — daily horoscope, transit cards
├── icons/         — CelestialIcons.tsx (domain icons), PlusIcon.tsx
├── landing/       — marketing sections
├── oracle/        — AI oracle panel and reading stream
└── upgrade/       — pricing toggle, upgrade prompts
```

### Component File Convention

```tsx
'use client'  // all interactive components

import { motion } from 'framer-motion'
import { CelestialIcon } from '@/components/icons/CelestialIcons'

// House easing curve — use for all transitions
const EASE = [0.22, 0.68, 0.35, 1]

export function MyFeatureCard({ … }: Props) {
  return (
    <motion.div
      initial={{ opacity: 0, filter: 'blur(8px)' }}
      animate={{ opacity: 1, filter: 'blur(0px)' }}
      transition={{ duration: 0.5, ease: EASE }}
      className="rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur"
    >
      …
    </motion.div>
  )
}
```

---

## 4. Glassmorphism Pattern

The dominant card/panel style. Two equivalent approaches:

```tsx
// Option A: raw Tailwind (used in dashboard components)
<div className="rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur">

// Option B: `.glass` utility class (defined in globals.css)
<div className="glass rounded-2xl p-6">

// Option C: GlassCard from @stellaeum/ui (landing pages only)
<GlassCard>…</GlassCard>
```

When translating a Figma card with frosted-glass effect, default to **Option A** for dashboard components.

---

## 5. Clip-Path Aesthetic (Chamfered Corners)

Interactive panels and close buttons use this distinctive sci-fi chamfer:

```tsx
// Chamfered corner clip-path (16px cut)
style={{
  clipPath: 'polygon(0 0, calc(100% - 16px) 0, 100% 16px, 100% 100%, 16px 100%, 0 calc(100% - 16px))'
}}
```

Use this on primary action panels, info overlays, and sci-fi-style buttons — not on standard content cards.

---

## 6. Icon System

### Domain Icons: `CelestialIcons.tsx`

All astrological icons live in `apps/web/components/icons/CelestialIcons.tsx`. Always use these for zodiac signs, planets, and astrological points — never substitute Lucide icons.

```tsx
import { CelestialIcon, SunIcon, MoonIcon, GlyphDefs } from '@/components/icons/CelestialIcons'

// By string key (preferred when name is dynamic)
<CelestialIcon name="sun" size={24} className="text-yellow-400" />
<CelestialIcon name="northNode" size={16} />

// Named export (compile-time known)
<SunIcon size={24} className="text-secondary" />
<MoonIcon size={20} className="text-blue-300" />

// Available keys:
// Planets: sun, moon, mercury, venus, mars, jupiter, saturn, uranus, neptune, pluto, northNode, rising
// Signs:   aries, taurus, gemini, cancer, leo, virgo, libra, scorpio, sagittarius, capricorn, aquarius, pisces
```

**Icon design spec:** 1.5px stroke, `currentColor`, round caps/joins, geometric forms. Color via Tailwind className.

**For D3/SVG contexts** (natal wheel): use `<GlyphDefs />` + `<use href="#glyph-{name}" />`.

### UI Icons: `lucide-react`

Used only in `FeaturesSection.tsx`. For all new UI icons outside astrological domain, use lucide-react:

```tsx
import { Star, Sparkles, Calendar, Bell } from 'lucide-react'
```

---

## 7. Animation

### Framer Motion — Standard Patterns

```tsx
import { motion, AnimatePresence } from 'framer-motion'

const EASE = [0.22, 0.68, 0.35, 1]  // house easing curve

// Fade-in blur (most common page/section entry)
<motion.div
  initial={{ opacity: 0, filter: 'blur(8px)' }}
  animate={{ opacity: 1, filter: 'blur(0px)' }}
  transition={{ duration: 0.5, ease: EASE }}
>

// Staggered list item (pass index as custom)
<motion.div
  custom={index}
  variants={{
    hidden: { opacity: 0, y: 16 },
    visible: (i) => ({ opacity: 1, y: 0, transition: { delay: i * 0.08, ease: EASE } })
  }}
  initial="hidden"
  animate="visible"
>

// Modal / overlay
<AnimatePresence>
  {isOpen && (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.2, ease: EASE }}
    >
  )}
</AnimatePresence>
```

### CSS Keyframe Animations (`globals.css`)

Available utility classes for thematic effects:

| Class | Effect |
|-------|--------|
| `animate-stand-summon` | Scale+blur entry for planet cards |
| `animate-stand-emerge` | Emergence reveal |
| `animate-aura-pulse` | Opacity breathing glow |
| `animate-menacing` | Floating menace symbols |
| `animate-energy-radiate` | Expanding ring pulse |
| `animate-dramatic-slash` | clip-path wipe reveal |

---

## 8. Responsive Design

Mobile-first, Tailwind default breakpoints only:

```tsx
// Container
<div className="container mx-auto px-4">

// Responsive grid
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">

// Responsive typography
<h1 className="text-4xl md:text-6xl">
<section className="py-32 md:py-40">

// Hide/show
<nav className="hidden md:flex">
<div className="block md:hidden">
```

No custom breakpoints — only `sm`, `md`, `lg`, `xl`, `2xl`.

---

## 9. Color Palette for Astrological Content

Planet and sign accent colors are defined as JS objects in chart components (not CSS variables). When building chart-adjacent components, use these values for consistency:

```ts
// Planet accent colors (from NatalWheel / HoroscopeStream)
const PLANET_COLORS: Record<string, string> = {
  sun:     '#fbbf24',  // gold (--color-secondary)
  moon:    '#93c5fd',  // blue-300
  mercury: '#6ee7b7',  // emerald-300
  venus:   '#f9a8d4',  // pink-300
  mars:    '#fca5a5',  // red-300
  jupiter: '#86efac',  // green-300
  saturn:  '#d8b4fe',  // purple-300
  uranus:  '#67e8f9',  // cyan-300 (~--color-primary)
  neptune: '#a5b4fc',  // indigo-300
  pluto:   '#c084fc',  // purple-400
}
```

> **Known gap:** These are not hoisted to CSS variables. If a Figma design references a planet color token, use the above hex values and mirror them in both the component and any new chart context.

---

## 10. Localization

The app is in Bulgarian (`bg-BG`). All UI text in components must be in Bulgarian:

```tsx
// Dates
new Intl.DateTimeFormat('bg-BG', { weekday: 'long', month: 'long', day: 'numeric' })

// aria-labels on interactive elements (accessibility)
<button aria-label="Отвори менюто">…</button>

// Clerk is configured with Bulgarian locale: localization={bgBG}
```

When implementing Figma designs with placeholder text, use Bulgarian placeholder strings.

---

## 11. Figma → Code Mapping Rules

When receiving design output from the Figma MCP server (`get_design_context`):

| Figma design element | Code approach |
|----------------------|---------------|
| Frosted glass card | `rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur` |
| Cyan accent color (`#22d3ee`) | `text-primary` / `bg-primary` / `border-primary` |
| Gold accent color (`#fbbf24`) | `text-secondary` / `bg-secondary` |
| Dark navy background | `bg-background` |
| Elevated panel | `bg-surface` |
| Heading font (Manrope) | `font-display` |
| Body font (Inter) | `font-body` |
| Brand/Roman numerals (Cinzel) | `font-cinzel` |
| Chamfered corner cut | `clipPath: 'polygon(0 0, calc(100% - 16px) 0, 100% 16px, ...)'` |
| Zodiac/planet icon | `<CelestialIcon name="…" />` |
| Fade-in entry animation | `motion.div` with blur+opacity initial state |
| Staggered list | Framer Motion `custom={i}` with delay variant |
| Absolute-positioned hex colors | Map to nearest token or PLANET_COLORS entry |
| Raw pixel spacing (e.g. 24px) | `p-6` (6 × 4px = 24px) |

---

## 12. File Placement for New Components

| Feature area | Destination |
|---|---|
| Marketing / landing | `apps/web/components/landing/` or `@stellaeum/ui` primitives |
| Dashboard widgets | `apps/web/components/dashboard/` |
| Chart / visualization | `apps/web/components/chart/` |
| Astrology data cards | `apps/web/components/horoscope/` |
| Auth flows | `apps/web/components/auth/` |
| Paywalls / pricing | `apps/web/components/upgrade/` |
| New icons | `apps/web/components/icons/CelestialIcons.tsx` (add to existing file) |
| New design tokens | `apps/web/app/globals.css` (`:root`) + `apps/web/tailwind.config.ts` |

Path alias: `@/` resolves to `apps/web/`.

---

## 13. What NOT to do

- Do not create CSS Modules, styled-components, or any CSS-in-JS
- Do not add new breakpoints — use Tailwind defaults only
- Do not use `px-` / `py-` hardcoded pixel values in `style={}` for layout spacing when a Tailwind class exists
- Do not wrap CSS variable values in `rgb()` in globals.css
- Do not use Cinzel font for Bulgarian text
- Do not use Lucide icons for zodiac signs or planets — use `CelestialIcons`
- Do not import `GlassCard` from `@stellaeum/ui` into dashboard/app components (landing only)
- Do not create new animation keyframes in components — add them to globals.css
- Do not create token JSON files or Style Dictionary configs
