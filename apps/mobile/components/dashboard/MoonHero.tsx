import { Text, View, useWindowDimensions } from 'react-native'

import { MoonGlyph } from '@/components/dashboard/MoonGlyph'
import { color, type } from '@/components/design-system/tokens'

/**
 * Днес's hero, split out of index.tsx (Stage 2, 2026-07-27) per the
 * proposed-at-investigation LOC split — the route file was already 430
 * lines before this pass added the moon sizing/eyebrow rework.
 *
 * Rebuilt 1:1 against `.moon-stage`/`.phase-mark`/`.phase-sub` in the
 * ratified mockup (.planning/design/mockups/_source-v4.html), not the
 * pre-Stage-2 implementation. Corrections vs. that prior version:
 *   1. The moon is sized off the frame, not a fixed 92px/150px bloom.
 *      The mockup's own ratio is 52% of frame width. Two deliberate
 *      departures since, both to make room for other content, not
 *      fidelity misses: 2026-07-27 device pass landed at 0.45 (13.5%
 *      down from 0.52) to fit the enlarged date/greeting block above;
 *      a second pass the same day, once Питай Оракула moved back into
 *      normal flow (no longer viewport-pinned) and needed its own room
 *      below the reading, took it down again to 0.40 (23% down); a third
 *      pass, same day, to buy vertical room for the two new section-
 *      heading captions (item 3, source-provenance labelling), landed at
 *      0.345 — 34% down from the mockup's 0.52 overall.
 *   2. The phase name (`lunarPhase.name`) is a tracked-caps eyebrow
 *      UNDER the moon, not a second hero competing with it — see the
 *      doc-reconciliation note in MOBILE_ALPHA_REDESIGN.md.
 *
 * Halo/depth-twin/tint-circle proportions all derive from `size` inside
 * MoonGlyph (bloomSize = size × haloRatio, tint radii = size-relative
 * fractions), so shrinking `size` here scales all of them together —
 * there's no separate ratio to remember to update.
 *
 * Item 3/4 (2026-07-27, caption ownership correction): the caller renders
 * a "небесен ритъм" section caption above this component. It originally
 * sat above the GLYPH, with the actual data (phaseName/subLabel)
 * rendering ~700px below it — the caption never visibly owned the block
 * it labels. Reordered: phaseName + subLabel render FIRST, directly under
 * the caption, with the glyph as the illustration below that pairing —
 * same "caption immediately precedes its data" shape as "дневен хороскоп"
 * preceding the reading text, not a glyph.
 *
 * Vertical compression (2026-07-27, same device pass): every internal gap
 * tightened — caption→phaseName, phaseName→subLabel, subLabel→glyph —
 * pulling the whole column up per the founder's "more content above the
 * fold" instruction.
 *
 * Vertical compression, second pass (2026-07-27): the subLabel→glyph
 * `marginTop` was already tight (12), but the perceived gap stayed large
 * because that margin sits above the GLOW box (bloomSize = size ×
 * haloRatio), not the visible disk — at haloRatio 1.83 the disk is only
 * ~55% of its own bounding box, so ~45% of "the moon's stage" was
 * invisible halo padding on every side, not glyph. haloRatio dropped to
 * 1.4 (glow shrinks, stays visible, doesn't disappear) and marginTop to
 * 8 — tightens both the subLabel→moon gap and the halo's own padding
 * above/below the disk in one change, since they're the same box.
 * Deliberate departure from the mockup's own halo proportions, pending
 * the founder's device check like every other departure today.
 *
 * Founder device-pass fix (2026-07-28): moon sized down again, 0.345 →
 * 0.32 (7% further, 38% down from the mockup's 0.52 overall) — buys room
 * for the legibility pass on subLabel below (12 → 15px).
 */
const MOON_FRAME_RATIO = 0.32
export function MoonHero({
  illumination,
  isWaxing,
  phaseName,
  subLabel,
}: {
  illumination: number
  isWaxing: boolean
  phaseName: string
  subLabel: string
}) {
  const { width } = useWindowDimensions()
  const moonSize = Math.round(width * MOON_FRAME_RATIO)

  return (
    <View style={{ alignItems: 'center' }}>
      {/* Founder device-pass fix (2026-07-28, legibility): overrides
          type.eyebrow's shared 9.5px specifically here (not the shared
          token — other consumers weren't asked to change) — 9.5 → 13. */}
      <Text style={{ ...type.eyebrow, fontSize: 13, color: color.starlight, opacity: 0.82, textTransform: 'uppercase', marginTop: 8, textAlign: 'center' }}>
        {phaseName}
      </Text>
      {/* Founder device-pass fix (2026-07-28, legibility): 12 → 15 —
          "so even grandmas can read it," same reasoning as the greeting
          and meteor note (index.tsx). */}
      <Text style={{ fontFamily: 'EBGaramond-Italic', fontStyle: 'italic', fontSize: 15, color: color.muted, marginTop: 4, textAlign: 'center' }}>
        {subLabel}
      </Text>
      <View style={{ marginTop: 8 }}>
        <MoonGlyph
          illumination={illumination}
          isWaxing={isWaxing}
          size={moonSize}
          outlineWidth={0}
          haloRatio={1.4}
          haloGradient="bronzeViolet"
          darkOpacity={0.88}
          depthDouble
        />
      </View>
    </View>
  )
}
