import { useState } from 'react'
import { Pressable, Text, View } from 'react-native'
import Svg, { Defs, RadialGradient, Rect, Stop } from 'react-native-svg'

import { color, font, pressFeedback } from '@/components/design-system/tokens'

/**
 * Карта's Big Three — Stage 2 (2026-07-27), Decision (b), restructured
 * 2026-07-27 (founder device-pass, second correction).
 *
 * Original build was a 1:1 match to the mockup's single-line `.plaque`
 * (_source-v4.html §КАРТА: 11px, .16em tracking, `plaqueCool`, .85
 * opacity, one wrapped line) — confirmed byte-for-byte against the spec.
 * Still read as "text plopped in place" on device. Root cause wasn't
 * containment or missing chrome (a hairline-framed plate was proposed and
 * rejected: "two horizontal rules around a text line is a container in
 * everything but name, and it adds chrome to fix a problem that isn't
 * chrome"). The actual cause: "СЛЪНЦЕ СКОРПИОН · ЛУНА РИБИ · АСЦЕНДЕНТ
 * ВЕЗНИ" was one undifferentiated run of identical caps — luminary label
 * and sign value at the same size/weight/colour, separated only by dots,
 * reading as a string instead of data.
 *
 * Fixed inside the content, not around it — same lead/payoff logic
 * already in force on Днес (HoroscopeParagraph/LeadLine): luminary names
 * (Слънце/Луна/Асцендент) small and faint, sign values bright starlight
 * and categorically larger, baseline-aligned per row. Stacked as three
 * rows instead of one wrapped line — checked against the longest real
 * Bulgarian sign names (packages/astrology/constants.ts's ZODIAC_SIGNS_BG:
 * "Близнаци"/"Скорпион"/"Стрелец" at 8 letters, "Асцендент" itself at 9),
 * a single line risks an ugly mid-word wrap on a real chart at 390px that
 * the mockup's own sample ("Скорпион"/"Риби"/"Везни") never exercises.
 * Deliberate departure from the mockup's flat `.plaque` value, same
 * discipline as the other departures logged today (moon size, invite
 * placement) — the mockup's own treatment doesn't work on device, so this
 * doesn't chase it further.
 *
 * Each row stays independently tappable (onSelectSun/Moon/Rising) —
 * BigThreeCards was the ONLY reachable path to the Ascendant's
 * PlanetDetail sheet (the wheel itself has no Ascendant gem, only a
 * line); restructuring must not silently drop that path per "no content
 * becomes unreachable." No rules, no borders, no plate — the label/value
 * contrast alone carries the distinction.
 *
 * Founder device-pass fix (2026-07-27, alignment): the three rows were
 * each individually centered as their own Pressable, so a shorter row
 * ("Луна Риби") and a longer one ("Асцендент Близнаци") landed at
 * different left edges — they read as three separate centered strings,
 * not one aligned set. First attempt used a fixed-width label column
 * (LABEL_COLUMN_WIDTH=80, an estimate for "АСЦЕНДЕНТ" at this font).
 * Reported still stacked on device, unchanged in Chrome — the two
 * disagreed, which is the actual finding: Chrome's react-native-web maps
 * to CSS flexbox, the device runs Yoga, and text intrinsic sizing/
 * wrapping is exactly where they diverge. A browser render can verify
 * color/glow/type treatment here, NOT layout — it was never valid
 * evidence either way for this bug.
 *
 * Leading cause: iOS/Android Dynamic Type. RN Text scales its rendered
 * font size against the system accessibility text-size setting by
 * default (`allowFontScaling`, unset = true) — Chrome has no equivalent
 * concept, so a fixed-width column sized for the NOMINAL 9px would
 * silently overflow and WRAP under a larger system text size on a real
 * phone, invisible in every browser render and every source read (the
 * source only ever states the nominal size, not what it becomes after
 * scaling).
 *
 * Fixed without a fixed width at all, per the founder's explicit
 * constraint (no shrinking type to force a fit): each label's rendered
 * width is MEASURED via onLayout, and `minWidth` for all three is set to
 * the largest one seen — self-adjusting to whatever the system's actual
 * text scale produces, not a guessed pixel number that can be
 * outgrown. `numberOfLines={1}` on both label and value as a hard
 * backstop against wrapping regardless of any layout timing. Rows stay
 * left-aligned within their own wrapper (not individually centered); the
 * wrapper shrink-wraps to its widest row and gets centered as ONE unit
 * by its parent's `alignItems:'center'` (chart.tsx), same as before.
 *
 * TEMPORARY instrumentation (2026-07-27) — logs each row's/label's/
 * value's measured width+height plus the row's available width, so the
 * founder can confirm on-device whether text scaling is inflating these
 * beyond the nominal 9px/15px (a height roughly double the single-line
 * height means it wrapped). Delete once confirmed.
 *
 * Added a cool starlight/violet glow behind the group — same full-bleed-
 * wrapper-plus-Flexbox-centering technique already fixed on Pedestal/
 * CtaPanel (not the percentage-margin version), sized generously around
 * the three-row block rather than measured exactly.
 *
 * Founder device-pass fix (2026-07-28 — the actual root cause): device
 * instrumentation proved the row's flexDirection:'row' was computed
 * correctly in JS but not applied — it rendered as column-stretch
 * (label full row width, row height = label height + value height
 * stacked). Every broken property traced back to one thing: `style` was
 * passed as a FUNCTION (Pressable's pressed-state API). Moved to a
 * static object with pressed state tracked via onPressIn/onPressOut —
 * see CtaPanel.tsx's matching fix and header note for the same finding.
 *
 * Founder device-pass fix (2026-07-28, per-row glow): the one shared glow
 * behind the whole group is gone, replaced with an independent glow
 * behind EACH row — each luminary now reads as its own lit element, not
 * one wash behind three lines. Each row's glow sized to that row alone
 * (220×50), same full-bleed-wrapper-plus-Flexbox-centering technique.
 */
const LABEL_STYLE = {
  fontFamily: font.displayRegular,
  fontSize: 9,
  letterSpacing: 1.44, // .16em at 9px, same ratio as the mockup's own .plaque tracking
  textTransform: 'uppercase' as const,
  color: color.faint,
}
const VALUE_STYLE = {
  fontFamily: font.displayRegular,
  fontSize: 15,
  letterSpacing: 2.4, // .16em at 15px
  textTransform: 'uppercase' as const,
  color: color.starlight,
}
// Founder device-pass fix (2026-07-27, spacing): row gap increased
// (rhythm.tight=12 read as too tight for three independently tappable
// rows); exported so Pedestal.tsx can derive Асцендент→Детайли spacing
// as an exact 1.5× multiple of this, so Детайли reads as its own
// element rather than a fourth plaque line, not just "some" extra gap.
export const PLAQUE_ROW_GAP = 16

function PlaqueRow({
  label,
  value,
  onPress,
  labelMinWidth,
  onLabelMeasured,
}: {
  label: string
  value: string
  onPress: () => void
  labelMinWidth: number
  onLabelMeasured: (width: number) => void
}) {
  // Pressed-feedback moved off Pressable's function-style API (see
  // header comment) — tracked as plain state, applied via a static
  // style object.
  const [pressed, setPressed] = useState(false)
  // Founder device-pass fix (2026-07-28, adaptive glow): was a fixed
  // 220px, which didn't reach the end of longer rows (e.g. "Асцендент
  // Близнаци") and over-extended past shorter ones (e.g. "Луна Риби").
  // Measured off the row's own rendered width instead — encapsulates
  // whatever text actually renders, any character count, not a guess.
  const [rowWidth, setRowWidth] = useState(0)
  // Founder device-pass fix (2026-07-28, centering): the glow was
  // centering on the ROW's full box, but the label sits in a
  // shared-width column (labelMinWidth, right-aligned) so every row
  // shorter than the longest label ("Асцендент") has invisible padding
  // to the LEFT of its own visible text — centering on the full box
  // centered on that padding too, reading as drifted left of the actual
  // text for every row except the longest. Tracks this row's OWN label
  // width (not just contributing to the shared max) so the glow can be
  // offset past the padding and centered on what's actually visible.
  const [myLabelWidth, setMyLabelWidth] = useState(0)
  const labelPadding = Math.max(labelMinWidth - myLabelWidth, 0)
  const visibleWidth = Math.max(rowWidth - labelPadding, 0)
  const glowWidth = Math.max(visibleWidth + 85, 140)
  const rowStyle = {
    ...pressFeedback(pressed),
    flexDirection: 'row' as const,
    flexWrap: 'nowrap' as const,
    alignItems: 'baseline' as const,
  }

  const onRowLayout = (e: { nativeEvent: { layout: { width: number } } }) => setRowWidth(e.nativeEvent.layout.width)
  const onLabelLayout = (e: { nativeEvent: { layout: { width: number } } }) => {
    setMyLabelWidth(e.nativeEvent.layout.width)
    onLabelMeasured(e.nativeEvent.layout.width)
  }

  return (
    <Pressable
      onPress={onPress}
      onPressIn={() => setPressed(true)}
      onPressOut={() => setPressed(false)}
      onLayout={onRowLayout}
      style={{ ...rowStyle, position: 'relative' as const }}
    >
      <View
        style={{ position: 'absolute', left: labelPadding, right: 0, top: 0, bottom: 0, alignItems: 'center', justifyContent: 'center' }}
        pointerEvents="none"
      >
        <Svg width={glowWidth} height={50}>
          <Defs>
            <RadialGradient id={`plaque-row-glow-${label}`} cx="50%" cy="50%" r="50%">
              <Stop offset="0%" stopColor={color.cool} stopOpacity={0.16} />
              <Stop offset="100%" stopColor={color.cool} stopOpacity={0} />
            </RadialGradient>
          </Defs>
          <Rect width="100%" height="100%" fill={`url(#plaque-row-glow-${label})`} />
        </Svg>
      </View>
      <Text onLayout={onLabelLayout} numberOfLines={1} style={{ ...LABEL_STYLE, minWidth: labelMinWidth, textAlign: 'right' }}>
        {label}
      </Text>
      <Text numberOfLines={1} style={{ ...VALUE_STYLE, marginLeft: 8 }}>
        {value}
      </Text>
    </Pressable>
  )
}

export function Plaque({
  sunSign,
  moonSign,
  risingSign,
  onSelectSun,
  onSelectMoon,
  onSelectRising,
}: {
  sunSign: string
  moonSign: string
  risingSign: string
  onSelectSun: () => void
  onSelectMoon: () => void
  onSelectRising: () => void
}) {
  // Self-adjusting shared label column — see header comment. Starts at 0
  // (natural sizing, can't overflow) and grows to the widest measured
  // label; never a hardcoded guess that scaled text can outgrow.
  const [labelMinWidth, setLabelMinWidth] = useState(0)
  const onLabelMeasured = (width: number) => setLabelMinWidth((prev) => Math.max(prev, width))

  return (
    <View style={{ marginTop: 24, alignItems: 'flex-start', gap: PLAQUE_ROW_GAP }}>
      <PlaqueRow label="Слънце" value={sunSign} onPress={onSelectSun} labelMinWidth={labelMinWidth} onLabelMeasured={onLabelMeasured} />
      <PlaqueRow label="Луна" value={moonSign} onPress={onSelectMoon} labelMinWidth={labelMinWidth} onLabelMeasured={onLabelMeasured} />
      <PlaqueRow label="Асцендент" value={risingSign} onPress={onSelectRising} labelMinWidth={labelMinWidth} onLabelMeasured={onLabelMeasured} />
    </View>
  )
}
