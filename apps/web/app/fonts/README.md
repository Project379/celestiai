# Self-hosted fonts

Loaded by `app/fonts.ts` through `next/font/local`, so a build never fetches from
Google (CI run 37609324059 died in `nextFontGoogleFontLoader`).

Source: the `@fontsource/cinzel`, `@fontsource-variable/{manrope,inter,playfair-display}`
npm packages (5.3.0) — the woff2 files are copied verbatim, one per Unicode subset.
All four families are SIL Open Font License 1.1.

Subsets kept: `latin`, `latin-ext`, `cyrillic`. `cyrillic-ext` is dropped (Bulgarian
needs U+0400–045F only). Cinzel has no Cyrillic at all — Cyrillic on `font-cinzel`
falls through, glyph by glyph, to Playfair Display (see `app/fonts.ts`).

To update: `npm pack` the same packages and copy the matching files; do not hand-edit.
