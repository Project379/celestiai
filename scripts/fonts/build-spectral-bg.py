#!/usr/bin/env python3
"""Build the Stellaeum body/display font: Spectral with the Bulgarian letterforms frozen in.

WHY
  React Native cannot set a text locale or toggle OpenType `locl`, and a font
  that only shows Bulgarian forms for `lang="bg"` renders Russian-style forms on
  any device or browser whose language is not Bulgarian. So the Bulgarian
  (cyrl/BGR `locl`) glyphs are made the DEFAULT glyphs: every device, browser and
  lang tag shows the same letterforms. Founder decision 2026-10-07: pairing D,
  Spectral only, Bulgarian forms everywhere, upright only.

WHAT IT DOES (per weight: Regular, Medium, SemiBold, Bold)
  1. Downloads the pinned upstream file from google/fonts and verifies its SHA-256.
  2. Reads the single-substitution lookup behind `locl` for script `cyrl`,
     language `BGR` (23 glyphs: в г д ж з и й к л н п т ц ч ш щ ъ ь ю, Д Ж К Л)
     and re-points the cmap at the substituted glyphs ("freezing" the feature).
     GPOS kerning already covers the substituted glyphs (checked), so spacing is kept.
  3. Subsets to what the app needs (Basic Latin, Latin-1, Latin Extended-A/B,
     modifiers, combining marks, Cyrillic, general punctuation, currency, letterlike
     (№), arrows/math, geometric shapes, misc symbols, Alphabetic Presentation
     ligatures), keeping ALL layout features (tnum, lnum, onum, smcp, ...).
     Greek and Vietnamese-only blocks are dropped.
  4. Renames the family to "Spectral BG" (nameIDs 1, 3, 4, 6, 16). OFL: Spectral
     declares NO Reserved Font Name (the copyright line is "Copyright 2017 The
     Spectral Project Authors"), so renaming is not legally required; it is done so a
     modified file is never mistaken for upstream. Copyright and license strings
     are kept.
  5. Writes TTF (mobile) and WOFF2 (web) plus a manifest of sizes and hashes.

USAGE
  pip install fonttools brotli
  python scripts/fonts/build-spectral-bg.py [--cache DIR]

Outputs
  apps/mobile/assets/fonts/SpectralBG-{Regular,Medium,SemiBold,Bold}.ttf
  apps/web/app/fonts/spectral-bg-{400,500,600,700}.woff2
  apps/mobile/assets/fonts/OFL.txt, apps/web/app/fonts/OFL.txt
  scripts/fonts/spectral-bg.manifest.json
"""
import argparse
import hashlib
import json
import os
import sys
import urllib.request

from fontTools import subset
from fontTools.ttLib import TTFont

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
PIN = 'e4acad48be939e92f6fa35a006453db71be1f868'  # google/fonts, 2024-10-22, ofl/spectral
BASE = f'https://raw.githubusercontent.com/google/fonts/{PIN}/ofl/spectral/'
UPSTREAM = {
    'Regular': 'c89021dc20720c8d0dcf40b0b2f6e00c13665fa8041717f581396f51b8c78f5d',
    'Medium': 'f385bc588599c879112272711d4acecc126674009d747a27284f59e93a240e83',
    'SemiBold': '5f86915a744832ecf6e4a17ab04bea091b9fa992ef5164ff65ae34c1da2fe94b',
    'Bold': '70ddb1ec6ae3b0b8d0c79231f670de786978f19baeba2130757526e407aebf9b',
}
OFL_SHA = '501d6ceca8e552630fe3aa9442b9a818565680a1a2f79f3fb8c13d6f309a9e98'
WEIGHT = {'Regular': 400, 'Medium': 500, 'SemiBold': 600, 'Bold': 700}
FAMILY = 'Spectral BG'

UNICODE_RANGES = [
    (0x0020, 0x007E), (0x00A0, 0x00FF),   # Basic Latin, Latin-1
    (0x0100, 0x024F),                     # Latin Extended-A/B
    (0x02B0, 0x02FF),                     # spacing modifiers
    (0x0300, 0x036F),                     # combining marks (stress marks)
    (0x0400, 0x04FF),                     # Cyrillic
    (0x2000, 0x206F),                     # general punctuation (— – „ “ ” … ′ ″)
    (0x2070, 0x209F), (0x20A0, 0x20CF),   # super/subscripts, currency (€)
    (0x2100, 0x214F),                     # letterlike (№)
    (0x2190, 0x22FF),                     # arrows, math (− ×)
    (0x25A0, 0x25FF), (0x2600, 0x26FF),   # shapes, misc symbols (if present)
    (0xFB00, 0xFB06), (0xFEFF, 0xFEFF),   # f-ligatures, BOM/ZWNBSP
]


def sha256(path):
    h = hashlib.sha256()
    with open(path, 'rb') as f:
        h.update(f.read())
    return h.hexdigest()


def fetch(name, want, cache):
    os.makedirs(cache, exist_ok=True)
    path = os.path.join(cache, name)
    if not os.path.exists(path):
        urllib.request.urlretrieve(BASE + name, path)
    got = sha256(path)
    if got != want:
        sys.exit(f'{name}: sha256 {got} != pinned {want}')
    return path


def bgr_locl_mapping(font):
    gsub = font['GSUB'].table
    lang = None
    for sr in gsub.ScriptList.ScriptRecord:
        if sr.ScriptTag.strip() == 'cyrl':
            for ls in sr.Script.LangSysRecord:
                if ls.LangSysTag.strip() == 'BGR':
                    lang = ls.LangSys
    if lang is None:
        sys.exit('no cyrl/BGR language system found')
    lookups = set()
    for i in lang.FeatureIndex:
        rec = gsub.FeatureList.FeatureRecord[i]
        if rec.FeatureTag == 'locl':
            lookups.update(rec.Feature.LookupListIndex)
    mapping = {}
    for li in sorted(lookups):
        lookup = gsub.LookupList.Lookup[li]
        for st in lookup.SubTable:
            if lookup.LookupType == 7:
                st = st.ExtSubTable
            if not hasattr(st, 'mapping'):
                sys.exit(f'locl lookup {li} is not a single substitution; extend this script')
            mapping.update(st.mapping)
    return mapping


def freeze(font):
    mapping = bgr_locl_mapping(font)
    changed = 0
    for table in font['cmap'].tables:
        for cp, glyph in list(table.cmap.items()):
            if glyph in mapping:
                table.cmap[cp] = mapping[glyph]
                changed += 1
    best = font.getBestCmap()
    assert best[0x0434] in mapping.values(), 'U+0434 (д) was not re-pointed to its Bulgarian form'
    return len(mapping), changed


def rename(font, style):
    name = font['name']
    ps_style = style
    full = f'{FAMILY} {style}'
    ps = f'SpectralBG-{ps_style}'
    for rec in list(name.names):
        if rec.nameID == 1:
            rec.string = FAMILY if style in ('Regular', 'Bold') else f'{FAMILY} {style}'
        elif rec.nameID == 4:
            rec.string = full
        elif rec.nameID == 6:
            rec.string = ps
        elif rec.nameID == 3:
            rec.string = f'{ps};frozen-BGR;google-fonts-{PIN[:7]}'
        elif rec.nameID == 16:
            rec.string = FAMILY
    return font


def build_one(style, src, mobile_dir, web_dir):
    opts = subset.Options()
    opts.layout_features = ['*']
    opts.name_IDs = ['*']
    opts.name_languages = ['*']
    opts.notdef_outline = True
    opts.glyph_names = False
    opts.hinting = True
    opts.drop_tables += ['DSIG']
    font = TTFont(src, recalcTimestamp=False)
    n_map, n_cmap = freeze(font)
    unicodes = [cp for lo, hi in UNICODE_RANGES for cp in range(lo, hi + 1)]
    sub = subset.Subsetter(opts)
    sub.populate(unicodes=unicodes)
    sub.subset(font)
    rename(font, style)
    ttf = os.path.join(mobile_dir, f'SpectralBG-{style}.ttf')
    font.save(ttf)
    font.flavor = 'woff2'
    woff2 = os.path.join(web_dir, f'spectral-bg-{WEIGHT[style]}.woff2')
    font.save(woff2)
    return n_map, n_cmap, ttf, woff2


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--cache', default=os.path.join(os.environ.get('TEMP', '/tmp'), 'spectral-upstream'))
    args = ap.parse_args()
    mobile_dir = os.path.join(ROOT, 'apps', 'mobile', 'assets', 'fonts')
    web_dir = os.path.join(ROOT, 'apps', 'web', 'app', 'fonts')
    manifest = {'upstream': f'google/fonts@{PIN} ofl/spectral', 'files': {}}
    ofl = fetch('OFL.txt', OFL_SHA, args.cache)
    for d in (mobile_dir, web_dir):
        with open(ofl, 'rb') as s, open(os.path.join(d, 'OFL.txt'), 'wb') as t:
            t.write(s.read())
    for style, want in UPSTREAM.items():
        src = fetch(f'Spectral-{style}.ttf', want, args.cache)
        n_map, n_cmap, ttf, woff2 = build_one(style, src, mobile_dir, web_dir)
        manifest['files'][style] = {
            'frozen_glyphs': n_map, 'cmap_entries_repointed': n_cmap,
            'ttf': {'path': os.path.relpath(ttf, ROOT).replace(os.sep, '/'), 'bytes': os.path.getsize(ttf), 'sha256': sha256(ttf)},
            'woff2': {'path': os.path.relpath(woff2, ROOT).replace(os.sep, '/'), 'bytes': os.path.getsize(woff2), 'sha256': sha256(woff2)},
        }
        print(f'{style}: froze {n_map} glyphs ({n_cmap} cmap entries), ttf {os.path.getsize(ttf)} B, woff2 {os.path.getsize(woff2)} B')
    with open(os.path.join(ROOT, 'scripts', 'fonts', 'spectral-bg.manifest.json'), 'w', encoding='utf-8', newline='\n') as f:
        json.dump(manifest, f, indent=2)
        f.write('\n')


if __name__ == '__main__':
    main()
