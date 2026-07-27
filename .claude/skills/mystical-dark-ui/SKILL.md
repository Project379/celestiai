---
name: mystical-dark-ui
description: Create immersive dark-themed web interfaces with a mystical, celestial, or spiritual aesthetic. Use this skill whenever the user asks for dark luxury websites, spiritual/wellness/astrology/tarot/meditation UIs, mystical landing pages, celestial-themed dashboards, occult or esoteric design, fortune/horoscope apps, dark premium themes, or any interface that should feel atmospheric, enchanting, and otherworldly. Also trigger when keywords like "mystical", "celestial", "spiritual", "dark luxury", "cosmic", "ethereal", "witchy", "astrology", "tarot", "zodiac", "occult", "esoteric", "enchanted", or "dark premium" appear in the request. This skill produces React (.jsx) or HTML artifacts with deeply atmospheric dark designs.
---

# Mystical Dark UI Skill

Create immersive, atmospheric dark interfaces that feel like stepping into a candlelit sanctum — rich with depth, texture, and celestial wonder. This skill draws from the design language of premium spiritual/wellness platforms but adapts to any context that calls for dark luxury.

## When This Skill Applies

Any request for a dark, atmospheric, premium-feeling UI. The mystical aesthetic is the foundation, but it adapts: a tarot reading app, a luxury spa booking page, a premium music player, a dark-themed portfolio, a meditation timer, a cosmic dashboard. The unifying thread is **atmosphere over sterility**.

## Core Design Philosophy

The aesthetic is built on three pillars:

1. **Depth & Atmosphere** — Layered backgrounds, subtle gradients, ambient glow effects, and transparency create a sense of looking into infinite space
2. **Precious Accents** — Gold, silver, or luminous accent colors used sparingly feel luxurious against deep dark backgrounds
3. **Mystical Typography** — Serif or decorative display fonts for headings evoke an ancient, timeless quality; clean sans-serif for body text maintains readability

## Color System

Build every design around a carefully constructed dark palette. Never use flat `#000000` — darkness should have color and warmth.

### Base Palette Structure

```
--bg-deepest:     The void — deepest background (e.g., hsl(260, 40%, 5%))
--bg-deep:        Primary background (e.g., hsl(255, 35%, 8%))
--bg-elevated:    Cards, panels (e.g., hsl(250, 30%, 12%))
--bg-surface:     Interactive surfaces, hovers (e.g., hsl(248, 25%, 16%))
--border-subtle:  Borders, dividers (e.g., hsla(250, 20%, 40%, 0.2))
--border-glow:    Highlighted borders (e.g., hsla(45, 80%, 60%, 0.3))
--text-primary:   Main text (e.g., hsl(40, 20%, 90%))
--text-secondary: Subdued text (e.g., hsl(250, 15%, 60%))
--text-muted:     Hints, captions (e.g., hsl(250, 10%, 45%))
--accent-gold:    Primary accent (e.g., hsl(42, 75%, 55%))
--accent-glow:    Luminous effects (e.g., hsl(270, 60%, 65%))
--accent-warm:    Warm highlights (e.g., hsl(25, 70%, 55%))
```

### Palette Variations (pick one per project, or create your own)

**Celestial Indigo** (the classic) — Deep indigo/purple base, gold accents, cream text. Feels like a clear night sky.

**Obsidian & Amber** — Near-black with warm brown undertones, amber/honey accents. Feels like an ancient library.

**Midnight Teal** — Dark teal/navy base, silver-white accents, cool mint highlights. Feels like deep ocean.

**Volcanic** — Charcoal with subtle red warmth, copper/rose-gold accents. Feels like embers.

**Ethereal Violet** — Deep plum base, lavender glow accents, soft pink highlights. Feels dreamlike.

Always define the full set of CSS variables at the root. The accent color should appear in no more than 20% of the visual space — its power is in its rarity.

## Typography

### Font Pairing Strategy

Pair a **distinctive display/heading font** with a **refined body font**. The heading font carries the mystical character; the body font ensures readability.

Strong pairings (import from Google Fonts):
- **Playfair Display** (headings) + **Raleway** (body) — classic editorial elegance
- **Cinzel** (headings) + **Lato** (body) — ancient Roman gravitas
- **Cormorant Garamond** (headings) + **Nunito Sans** (body) — literary refinement
- **EB Garamond** (headings) + **Source Sans 3** (body) — scholarly warmth
- **Libre Baskerville** (headings) + **Open Sans** (body) — timeless readability
- **DM Serif Display** (headings) + **DM Sans** (body) — modern mystical

Heading styles:
- Use `font-style: italic` on hero/section titles for that mystical flourish
- Letter-spacing: `0.02em` to `0.08em` on headings for breathing room
- Consider `text-transform: uppercase` with generous tracking for labels/categories

Body text should be `16px` minimum, `line-height: 1.6` to `1.8`, with `font-weight: 300` or `400` for an airy feel against dark backgrounds.

## Layout Patterns

### Hero Sections
- Full-viewport height with layered background: deep gradient base + subtle radial glow + optional star/particle field
- Content offset to one side (not centered) for asymmetric drama
- A single luminous CTA button with subtle glow animation

### Card Grids
- Cards with `background: var(--bg-elevated)` and subtle `border: 1px solid var(--border-subtle)`
- On hover: border shifts to `var(--border-glow)`, card gets a faint box-shadow glow
- Rounded corners: `12px` to `16px` — generous but not cartoonish
- Inner padding: `24px` to `32px`
- Grid gaps: `20px` to `32px`

### Navigation
- Semi-transparent background: `background: hsla(var(--bg-deep-hsl), 0.8)` with `backdrop-filter: blur(12px)`
- Logo on the left, links centered or right-aligned
- Active link indicated by subtle gold underline or glow, not bold weight
- A prominent CTA button (e.g., "Login", "Get Started") with accent background and rounded-pill shape

### Content Sections
- Generous vertical padding: `80px` to `120px` between sections
- Section titles centered with a short description below
- Content width maxes at `1200px`, centered with auto margins

### Sidebar Layouts (for reading/article pages)
- Main content ~65%, sidebar ~30%, with gap between
- Sidebar has a slightly elevated background or subtle border
- Table of contents with smooth scroll anchors

## Visual Effects & Atmosphere

These effects create the "magic" — use them intentionally, not all at once.

### Background Atmosphere
```css
/* Radial glow — place behind hero or key sections */
.ambient-glow {
  position: absolute;
  width: 600px;
  height: 600px;
  border-radius: 50%;
  background: radial-gradient(circle, hsla(270, 60%, 40%, 0.15), transparent 70%);
  filter: blur(80px);
  pointer-events: none;
}

/* Star field — tiny dots scattered across background */
.stars {
  background-image:
    radial-gradient(1px 1px at 10% 20%, hsla(0,0%,100%,0.4), transparent),
    radial-gradient(1px 1px at 40% 60%, hsla(0,0%,100%,0.3), transparent),
    radial-gradient(1.5px 1.5px at 70% 30%, hsla(0,0%,100%,0.5), transparent);
  /* Repeat with 20-30 star positions for density */
}
```

### Glow Effects
```css
/* Button glow */
.btn-glow {
  box-shadow: 0 0 20px hsla(42, 75%, 55%, 0.2), 0 0 40px hsla(42, 75%, 55%, 0.1);
  transition: box-shadow 0.3s ease;
}
.btn-glow:hover {
  box-shadow: 0 0 25px hsla(42, 75%, 55%, 0.35), 0 0 50px hsla(42, 75%, 55%, 0.15);
}

/* Card hover glow */
.card:hover {
  border-color: hsla(42, 75%, 55%, 0.3);
  box-shadow: 0 4px 30px hsla(270, 60%, 40%, 0.1);
}

/* Text glow for special headings */
.glow-text {
  text-shadow: 0 0 30px hsla(42, 75%, 55%, 0.3);
}
```

### Glassmorphism
```css
.glass-panel {
  background: hsla(250, 30%, 15%, 0.6);
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  border: 1px solid hsla(250, 20%, 40%, 0.15);
  border-radius: 16px;
}
```

### Decorative Lines & Dividers
- Thin gradient lines: `background: linear-gradient(90deg, transparent, var(--accent-gold), transparent)`
- Height: `1px`, width: `60%-80%`, centered. Use between sections or under headings.

### Celestial SVG Decorations
Create simple SVG icons inline for: stars (4-point, 6-point), crescent moons, suns with rays, eye/third-eye motifs, zodiac symbols, lotus flowers, geometric mandalas. Keep them as thin line art in the accent color. Place them as floating decorative elements near section titles or in card corners.

## Animation Principles

### Page Load Sequence
Stagger content appearance for a reveal effect:
```css
@keyframes fadeInUp {
  from { opacity: 0; transform: translateY(20px); }
  to { opacity: 1; transform: translateY(0); }
}

.animate-in {
  animation: fadeInUp 0.6s ease-out forwards;
  opacity: 0;
}
/* Stagger with animation-delay: 0.1s increments */
```

### Hover Interactions
- Cards: gentle `translateY(-4px)` lift + glow intensification
- Buttons: glow pulse + slight scale `scale(1.02)`
- Links: underline slides in from left, or color shifts to accent
- Icons: subtle rotation or pulse

### Ambient Motion (optional, use sparingly)
- Floating particles drifting slowly upward (CSS animation or lightweight JS)
- Slow pulsing glow on hero background elements
- Parallax scroll on layered background elements

## Interactive Component Patterns

### Tarot/Card Selection
- Cards laid out in a row or fan arrangement
- Hover lifts card and adds golden border glow
- Selected cards flip or move to a "chosen" area
- Use CSS transforms for flip: `rotateY(180deg)` with `backface-visibility: hidden`

### Zodiac/Horoscope Grid
- 3×4 grid of sign cards, each with symbol + name + date range
- Hover reveals brief description or highlights the card
- Active sign gets accent border + elevated glow

### Chat/Conversation UI
- Dark message bubbles with accent-colored user messages
- Assistant messages in slightly elevated background
- Typing indicator with pulsing dots in accent color
- Input field with glass effect and subtle border glow on focus

### Blog/Article Cards
- Image at top with category badge overlay (accent background, small rounded pill)
- Title in heading font, excerpt in body font
- "Read more" link with arrow, accent-colored
- Hover lifts card slightly and brightens the image

### Category Filter Tabs
- Pill-shaped buttons in a row
- Active tab: filled with `var(--bg-surface)` or accent background
- Inactive: transparent with subtle border
- Smooth transition between states

## Implementation Checklist

When building a mystical dark UI, verify:

- [ ] CSS variables defined for entire color system at `:root`
- [ ] Google Fonts imported — one display, one body
- [ ] Background has depth (gradient, not flat color)
- [ ] At least one ambient glow element in the composition
- [ ] Cards/panels have subtle borders and hover states
- [ ] Typography hierarchy is clear (3 levels minimum)
- [ ] Accent color used sparingly but impactfully
- [ ] Animations are staggered on load, not simultaneous
- [ ] Interactive elements have hover/focus states
- [ ] Text contrast meets readability standards (cream/warm white on dark, not pure white)
- [ ] Responsive: works on mobile (stack grids, adjust padding)

## Adapting to Non-Spiritual Contexts

The mystical aesthetic translates to many domains. Adapt by:

- **Music/Audio app** → Replace celestial icons with musical notation, keep the dark luxury palette
- **Portfolio** → Replace service cards with project cards, keep the atmospheric hero
- **SaaS dashboard** → Replace zodiac grid with metrics cards, keep glass panels and glow effects
- **Restaurant/Bar** → Replace spiritual imagery with food/drink, keep the dark intimate vibe
- **Gaming** → Replace celestial motifs with game elements, amplify the particle effects

The key is keeping the **atmospheric depth**, **precious accents**, and **typographic elegance** — those are what make it feel premium. The specific icons and content are interchangeable.

## Reference

For detailed SVG icon patterns and extended component examples, see `references/components.md`.
