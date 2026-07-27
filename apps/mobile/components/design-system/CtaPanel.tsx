import { useState } from 'react'
import { Pressable, Text, View } from 'react-native'
import Animated from 'react-native-reanimated'
import Svg, { Circle, Defs, RadialGradient, Rect, Stop } from 'react-native-svg'

import { useBreathe } from './motion'
import { color, font, pressFeedback, type } from './tokens'

// Warm/cool amendment — the invitation primitive. CORRECTED (2026-07-25):
// the first version of this component had a Surface2 background + border
// — a bordered box, exactly the thing the approved design bans ("no
// pill, no border, no chevron... a lit phrase, not a drawn container").
// That was a real bug, not a design decision — fixed here to match the
// approved Днес mockup: a lit phrase (text glow via textShadow, no fill/
// border anywhere) plus one continuously breathing ember, no container.
//
// `hint` is for a SECOND LINE OF REAL DATA (e.g. Ритъм's active-transit
// name), not tap-explanation copy — passing one shifts to flex-start and
// row layout so the ember still anchors to the first line, not the
// combined block. See .planning/design/WARM_COOL_AMENDMENT.md §8.5 for the
// alignment bug this avoids.
//
// Stage 2 (2026-07-27) — rebuilt the no-hint path 1:1 against mockup
// `.invite`/`.invite-text`/`.ember` (_source-v4.html): centered (not
// row-left), 20px (not 17px), 9px text↔ember gap, padding 26/0/30 matching
// the mockup's own invite block spacing exactly since it's now the sole
// consumer (Днес). Founder correction (2026-07-27): originally viewport-
// pinned via ScreenShell's `pinnedBottom`, which put it directly behind
// the tab bar — reverted to normal in-flow placement, directly after the
// reading. No `marginTop` here; the call site supplies the `group` gap
// above it, same as every other section boundary on this screen.
// Founder device-pass fix (2026-07-27): a prior pass approximated
// `.invite-glow` with textShadow alone — checked against a real
// screenshot, it read as barely-there (RN-web's textShadow blur is much
// weaker than the mockup's actual 260×120 radial-gradient blob). Now
// built as a real oversized glow — an absolutely-positioned Svg ellipse
// behind the text, matching the mockup's own technique instead of
// approximating it — with textShadow kept as a secondary boost on the
// glyphs themselves.
// Founder device-pass fix (2026-07-27, second pass): the glow didn't sit
// behind the phrase — same auto-width percentage bug diagnosed and fixed
// in Pedestal.tsx (`left:'50%'` + a fixed negative margin only resolves
// correctly against a Pressable with a DEFINITE width; whether this one
// has one depends on its container at each call site, which shouldn't be
// load-bearing for something this visible). Fixed the same way: a
// full-bleed `left:0/right:0/top:0/bottom:0` wrapper + Flexbox centering,
// no percentage math against the Pressable's own resolved width.
// Founder device-pass fix (2026-07-27, third pass): confirmed via the
// item 1 instrumentation that the wrapper IS full-width and the glow WAS
// centered correctly against it — the label text itself just wasn't
// centered inside its own (shrink-wrapped) box, reading as "text on the
// left, glow in the middle." Explicit `alignItems`/`textAlign` center on
// the label now, instead of relying on the Pressable's row-level
// `justifyContent:'center'` to carry it.
// Founder device-pass fix (2026-07-27, fourth pass — the real invite/
// navbar bug): the glow is a position:absolute child, which RN does NOT
// clip to its parent's layout box by default — it paints outside the
// Pressable's own bounds. `paddingVertical` was 26 (box height ~76px),
// but the glow Svg is 120px tall, so ~22px of visible bronze light
// painted above and below the Pressable's own layout box on EVERY
// render, invisible to any onLayout/measureInWindow call on the
// Pressable (those only ever see the 76px layout box, never the
// overflow) — this is why the item-1 instrumentation read "clears the
// tab bar" while a screenshot showed light bleeding into it. Fixed at
// the source: paddingVertical raised to 48 so the box is 120px tall,
// exactly containing the glow — no overflow left to be invisible to
// layout measurement. Same audit needed (and applied) on Pedestal.tsx.
// Founder device-pass fix (2026-07-27, ember): the breathing dot read as
// missing/invisible on Android. Root cause: shadowColor/shadowOpacity/
// shadowRadius/shadowOffset are iOS-only in RN's core StyleSheet — they
// need `elevation` on Android, and even with elevation, Android's
// elevation shadow is a fixed grey/black system shadow, not an arbitrary
// colored glow, so it wouldn't read as bronze light either way. Same
// "shadow-only reads too weak" lesson as this file's own `.invite-glow`
// fix above — replaced with a real small Svg radial-gradient blob behind
// the dot (EmberGlow below), the same technique used everywhere else in
// this app for glow, cross-platform by construction.
// Founder device-pass fix (2026-07-28 — the actual root cause of the
// glow cutoff AND the ember mislocation): device instrumentation proved
// flexDirection:'row' and paddingVertical:48 were being computed
// correctly in JS (logged, confirmed) but NOT applied to the native
// layout — the Pressable rendered as column-stretch (Yoga's default)
// regardless. The one thing every broken property had in common:
// `style` was passed as a FUNCTION (`({pressed}) => ({...})`), Pressable's
// own API for pressed-state styling. Moving layout onto a STATIC object
// (pressed state tracked via onPressIn/onPressOut instead) restored
// correct application — the function-style path on Pressable was the
// override, not any individual property.
// Founder device-pass fix (2026-07-28, ember side): moved from right of
// the phrase to LEFT — a deliberate reversal of every prior round's spec
// (confirmed explicitly, not a guess). JSX order swapped (ember renders
// before the label now) since this is a row layout — visual left-to-right
// order follows JSX child order.
function EmberGlow({ size, color: glowColor }: { size: number; color: string }) {
  return (
    <Svg width={size} height={size} style={{ position: 'absolute', top: 0, left: 0 }} pointerEvents="none">
      <Defs>
        <RadialGradient id="ember-glow" cx="50%" cy="50%" r="50%">
          <Stop offset="0%" stopColor={glowColor} stopOpacity={0.9} />
          <Stop offset="35%" stopColor={glowColor} stopOpacity={0.45} />
          <Stop offset="100%" stopColor={glowColor} stopOpacity={0} />
        </RadialGradient>
      </Defs>
      <Circle cx={size / 2} cy={size / 2} r={size / 2} fill="url(#ember-glow)" />
    </Svg>
  )
}

export function CtaPanel({
  label,
  hint,
  onPress,
  accentColor = color.bronze,
  accentTextColor = color.bronzeText,
}: {
  label: string
  hint?: string
  onPress: () => void
  accentColor?: string
  accentTextColor?: string
}) {
  const breathe = useBreathe(2600, [0.5, 1])
  // Pressed-feedback moved off Pressable's function-style API (see header
  // comment) — tracked as plain state, applied via a static style object.
  const [pressed, setPressed] = useState(false)

  // Founder device-pass fix (2026-07-28, second pass): 'baseline' treats
  // a non-Text child's "baseline" as its own bottom edge, which doesn't
  // reliably line up with the text's actual visual center — tuning it
  // with a negative-margin fudge factor wasn't converging. Switched to
  // 'center', which aligns every child by vertical midpoint instead of
  // guessing at text metrics — more predictable for a circular dot next
  // to a text label.
  const pressableStyle = {
    ...pressFeedback(pressed),
    paddingVertical: hint ? 0 : 48,
    flexDirection: 'row' as const,
    alignItems: hint ? ('flex-start' as const) : ('center' as const),
    justifyContent: hint ? ('flex-start' as const) : ('center' as const),
    gap: hint ? 10 : 9,
    position: 'relative' as const,
  }

  return (
    <Pressable
      onPress={onPress}
      onPressIn={() => setPressed(true)}
      onPressOut={() => setPressed(false)}
      accessibilityRole="button"
      accessibilityLabel={hint ? `${label} — ${hint}` : label}
      style={pressableStyle}
    >
      {!hint && (
        <View
          style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, alignItems: 'center', justifyContent: 'center' }}
          pointerEvents="none"
        >
          <Svg width={260} height={120}>
            <Defs>
              <RadialGradient id="invite-glow" cx="50%" cy="50%" r="50%">
                <Stop offset="0%" stopColor={accentColor} stopOpacity={0.28} />
                <Stop offset="100%" stopColor={accentColor} stopOpacity={0} />
              </RadialGradient>
            </Defs>
            <Rect width="100%" height="100%" fill="url(#invite-glow)" />
          </Svg>
        </View>
      )}
      <View
        style={{
          width: hint ? 22 : 20,
          height: hint ? 22 : 20,
          marginTop: hint ? 5 : 0,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <EmberGlow size={hint ? 22 : 20} color={accentColor} />
        <Animated.View
          style={[
            {
              width: hint ? 6 : 5,
              height: hint ? 6 : 5,
              borderRadius: 3,
              backgroundColor: accentColor,
              // iOS-only (see the header comment) — kept as a secondary
              // boost there; EmberGlow carries the visible glow on both
              // platforms now.
              shadowColor: accentColor,
              shadowOpacity: 0.9,
              shadowRadius: 6,
              shadowOffset: { width: 0, height: 0 },
            },
            breathe,
          ]}
        />
      </View>
      <View style={{ flex: hint ? 1 : undefined, alignItems: hint ? 'flex-start' : 'center' }}>
        <Text
          style={{
            fontFamily: font.displaySemibold,
            fontSize: hint ? 17 : 20,
            letterSpacing: hint ? undefined : 0.2,
            color: accentTextColor,
            textAlign: hint ? 'left' : 'center',
            textShadowColor: `${accentColor}99`,
            textShadowRadius: 14,
            textShadowOffset: { width: 0, height: 0 },
          }}
        >
          {label}
        </Text>
        {hint && <Text style={{ ...type.caption, color: color.muted, marginTop: 2 }}>{hint}</Text>}
      </View>
    </Pressable>
  )
}
