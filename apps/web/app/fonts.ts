import localFont from 'next/font/local'

// One family for the whole web app: Spectral with the Bulgarian letterforms
// frozen in as the default glyphs (founder decision 2026-10-07, pairing D). The
// files are built by scripts/fonts/build-spectral-bg.py — see ./fonts/README.md.
// Because the Bulgarian forms are the default glyphs, they show regardless of the
// page's lang attribute or the browser's language; lang="bg" stays on <html> for
// screen readers and hyphenation, not for glyph selection.
//
// Static, upright only: Regular / Medium / SemiBold / Bold (the italic face is
// dropped from the plan). next/font statically analyses this call, so it is
// written out literally.

export const spectral = localFont({
  src: [
    { path: './fonts/spectral-bg-400.woff2', weight: '400', style: 'normal' },
    { path: './fonts/spectral-bg-500.woff2', weight: '500', style: 'normal' },
    { path: './fonts/spectral-bg-600.woff2', weight: '600', style: 'normal' },
    { path: './fonts/spectral-bg-700.woff2', weight: '700', style: 'normal' },
  ],
  variable: '--ff-spectral',
  display: 'swap',
  adjustFontFallback: false,
})

/** Class name that defines the --ff-spectral variable; put on <html>. */
export const fontVariableClasses = spectral.variable
