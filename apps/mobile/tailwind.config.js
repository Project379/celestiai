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
        // Both names now resolve to the loaded Spectral BG files (2026-10-07;
        // `font-cinzel` used to point at an unloaded family and fell back to the
        // system font on Cyrillic). NativeWind's font-weight classes cannot pick a
        // different static file for a custom family — components that need a weight
        // use the tokens in components/design-system/tokens.ts.
        cinzel: ['SpectralBG-Regular'],
        display: ['SpectralBG-SemiBold'],
      },
    },
  },
  plugins: [],
}
