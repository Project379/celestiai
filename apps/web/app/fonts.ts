import localFont from 'next/font/local'

// Self-hosted (next/font/local) — no build-time fetch from Google. See
// ./fonts/README.md for provenance and the subset list.
//
// Each Unicode subset is its own family, composed into one stack in
// globals.css (--font-display / --font-body / --font-cinzel). A browser walks a
// font-family stack glyph by glyph, so Latin text is served from the `latin`
// file and Cyrillic falls through to the `cyrillic` one. `adjustFontFallback:
// false` matters here: the generated size-adjusted fallback face would
// otherwise sit between the subsets and swallow the Cyrillic glyphs.
//
// Every localFont() call is written out literally on purpose: next/font
// statically analyses the arguments at build time, so spreads and helper
// wrappers fail the build ("Unexpected spread").

export const manropeLatin = localFont({
  src: './fonts/manrope-latin-wght-normal.woff2',
  weight: '200 800',
  variable: '--ff-manrope-latin',
  display: 'swap',
  adjustFontFallback: false,
})

export const manropeLatinExt = localFont({
  src: './fonts/manrope-latin-ext-wght-normal.woff2',
  weight: '200 800',
  variable: '--ff-manrope-latin-ext',
  display: 'swap',
  adjustFontFallback: false,
})

export const manropeCyrillic = localFont({
  src: './fonts/manrope-cyrillic-wght-normal.woff2',
  weight: '200 800',
  variable: '--ff-manrope-cyrillic',
  display: 'swap',
  adjustFontFallback: false,
})

export const interLatin = localFont({
  src: './fonts/inter-latin-wght-normal.woff2',
  weight: '100 900',
  variable: '--ff-inter-latin',
  display: 'swap',
  adjustFontFallback: false,
})

export const interLatinExt = localFont({
  src: './fonts/inter-latin-ext-wght-normal.woff2',
  weight: '100 900',
  variable: '--ff-inter-latin-ext',
  display: 'swap',
  adjustFontFallback: false,
})

export const interCyrillic = localFont({
  src: './fonts/inter-cyrillic-wght-normal.woff2',
  weight: '100 900',
  variable: '--ff-inter-cyrillic',
  display: 'swap',
  adjustFontFallback: false,
})

export const playfairLatin = localFont({
  src: './fonts/playfair-display-latin-wght-normal.woff2',
  weight: '400 900',
  variable: '--ff-playfair-latin',
  display: 'swap',
  adjustFontFallback: false,
})

export const playfairLatinExt = localFont({
  src: './fonts/playfair-display-latin-ext-wght-normal.woff2',
  weight: '400 900',
  variable: '--ff-playfair-latin-ext',
  display: 'swap',
  adjustFontFallback: false,
})

export const playfairCyrillic = localFont({
  src: './fonts/playfair-display-cyrillic-wght-normal.woff2',
  weight: '400 900',
  variable: '--ff-playfair-cyrillic',
  display: 'swap',
  adjustFontFallback: false,
})

// Cinzel: Latin only (no Cyrillic glyphs exist). Static weights 400/600/700.
export const cinzelLatin = localFont({
  src: [
    { path: './fonts/cinzel-latin-400-normal.woff2', weight: '400', style: 'normal' },
    { path: './fonts/cinzel-latin-600-normal.woff2', weight: '600', style: 'normal' },
    { path: './fonts/cinzel-latin-700-normal.woff2', weight: '700', style: 'normal' },
  ],
  variable: '--ff-cinzel-latin',
  display: 'swap',
  adjustFontFallback: false,
})

/** Class names that define every --ff-* variable; put on <html>. */
export const fontVariableClasses = [
  manropeLatin,
  manropeLatinExt,
  manropeCyrillic,
  interLatin,
  interLatinExt,
  interCyrillic,
  playfairLatin,
  playfairLatinExt,
  playfairCyrillic,
  cinzelLatin,
]
  .map((f) => f.variable)
  .join(' ')
