# Self-hosted fonts

Loaded by `app/fonts.ts` through `next/font/local`, so a build never fetches from
Google.

**One family: Spectral BG** — Spectral (Production Type, SIL OFL 1.1) with the
Bulgarian letterforms (cyrl/BGR `locl`) frozen in as the default glyphs, so every
browser shows them whatever the page's `lang` or the user's language. Founder
decision 2026-10-07 (pairing D: Spectral only, Bulgarian forms everywhere, upright
only). Weights 400 / 500 / 600 / 700, no italic.

- Source: `google/fonts@e4acad4` `ofl/spectral/Spectral-{Regular,Medium,SemiBold,Bold}.ttf`
  (SHA-256 pinned in the build script).
- Built by `scripts/fonts/build-spectral-bg.py` (freeze + subset to Latin, Cyrillic,
  punctuation, currency, №, math; all layout features kept, `tnum` included);
  sizes and hashes in `scripts/fonts/spectral-bg.manifest.json`. Do not hand-edit
  the woff2 files — rerun the script.
- License: `OFL.txt`. Spectral declares no Reserved Font Name; the modified files
  are nevertheless renamed "Spectral BG".
