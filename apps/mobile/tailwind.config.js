/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,jsx,ts,tsx}',
    './components/**/*.{js,jsx,ts,tsx}',
    '../../packages/ui/**/*.{js,jsx,ts,tsx}',
  ],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        bg: '#08060f',
        // Matches components/design-system/tokens.ts's color.bronze/
        // bronzeText exactly (Batch 6, 2026-08-16) — keep the two in sync if
        // either changes. amber-stellaeum (was '#fbbf24') retired with it;
        // had zero class consumers, safe to drop rather than rename.
        bronze: '#b8763e',
        'bronze-text': '#d9a06a',
        'violet-stellaeum': '#8b5cf6',
      },
      fontFamily: {
        // Deliberately left pointing at the unloaded family name 'Cinzel'
        // (not 'Cinzel-Regular') — existing screens (P.1-P.10) use
        // `font-cinzel` on Cyrillic text throughout and must keep
        // rendering exactly as founder has been testing them (system-font
        // fallback) until that's fixed as its own tracked item. The new
        // MOBILE-ALPHA-REDESIGN primitives reference loaded font postscript
        // names directly via components/design-system/tokens.ts inline
        // styles, not this NativeWind class, so they're unaffected by this
        // key either way. See MOBILE_ALPHA_REDESIGN.md risk list.
        cinzel: ['Cinzel'],
        display: ['EB Garamond'],
      },
    },
  },
  plugins: [],
}
