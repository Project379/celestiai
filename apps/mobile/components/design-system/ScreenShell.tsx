import type { ComponentProps, ReactNode } from 'react'
import { useState } from 'react'
import { ScrollView, View, type LayoutChangeEvent, type NativeScrollEvent, type NativeSyntheticEvent } from 'react-native'
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context'
import Animated from 'react-native-reanimated'
import Svg, { Defs, Ellipse, LinearGradient, RadialGradient, Rect, Stop } from 'react-native-svg'

import { AmbientBackground } from './AmbientBackground'
import { BackButton } from './BackButton'
import { color, space } from './tokens'
import { useBackButtonVisibility } from './useBackButtonVisibility'
import { PERF_DEBUG } from '@/lib/perfDebug'

type Temperature = 'warm' | 'cool' | 'neutral'

// Stage 2 (2026-07-27) — mockup `.warm-wash`/`.cool-wash` (_source-v4.html)
// are each ONE two-layer wash per screen (a warm ellipse + a violet ellipse,
// or a violet ellipse + a cool ellipse, positioned/sized/opacity-tuned
// specifically per temperature), not "always-on violet + a conditional
// second glow" the way the pre-Stage-2 shell rendered it. Collapsed to a
// single per-temperature spec so there is exactly one wash concept per
// screen, matching the mockup's own single `.warm-wash`/`.cool-wash` rule
// — rx/ry are read directly off the mockup's pixel ellipse sizes (e.g.
// `ellipse 340px 300px`), not re-derived.
//
// Founder device-pass fix (2026-07-27): the first Stage 2 pass filled a
// Rect with a `cx/cy` percentage RadialGradient (`r="60%"` of
// objectBoundingBox) — on a box whose aspect ratio isn't square, that
// makes the gradient an ellipse shaped by the CONTAINER's proportions,
// not the mockup's actual 340×300-ish proportions, and spreads the color
// thin across a much larger area than intended (checked against a real
// screenshot: the glow read as "missing," not just dim). Switched to real
// `<Ellipse>` shapes sized in pixels — each with its own default
// (shape-relative) gradient, so the glow's shape/size is what the mockup
// actually specifies regardless of the screen's height.
// Founder device-pass fix (2026-07-28): the warm wash's own bronze
// ellipse read as a stray, useless glow unrelated to the invite — bronze
// is reserved for the invite's own glow specifically now, not ambient
// atmosphere. Removed; violet-only ambient wash on warm screens.
const WASH_SPEC: Record<Temperature, { cxPct: number; cyPct: number; rx: number; ry: number; color: string; opacity: number }[]> = {
  warm: [
    { cxPct: 0.12, cyPct: 0.06, rx: 130, ry: 110, color: color.violet, opacity: 0.1 },
  ],
  cool: [
    { cxPct: 0.5, cyPct: 0.3, rx: 160, ry: 150, color: color.violet, opacity: 0.14 },
    { cxPct: 0.85, cyPct: 0.9, rx: 130, ry: 100, color: color.cool, opacity: 0.1 },
  ],
  neutral: [{ cxPct: 0.1, cyPct: 0, rx: 140, ry: 140, color: color.violet, opacity: 0.1 }],
}

// Founder correction (2026-07-27, THIRD pass — reversing the "drop
// pinning entirely" call from earlier the same day): pinnedBottom is
// back for Днес's invite. The in-flow version failed for a structural
// reason, not a positioning one — with variable-length AI readings, an
// invite at the end of scrollable content is only guaranteed visible
// without scrolling if it's pinned; nothing about in-flow placement can
// promise that. The ORIGINAL pinned version failed because nothing
// coordinated its position against the tab bar's own absolute
// positioning (see TAB_BAR_BASE_HEIGHT/TAB_BAR_CLEARANCE below) — that's
// what was actually wrong, not pinning as a mechanism. Карта's tap hint
// stays in normal flow; this prop is Днес-only again.
//
// Tab-bar clearance (2026-07-27, item 1 fix): the trailing paddingBottom
// used to be a flat, non-inset-aware 100 — on-device instrumentation
// measured the last in-flow element resting only 11px above the tab
// bar's top edge (clearance = paddingBottom - tabBarHeight, and
// tabBarHeight already ate most of the flat 100). Computed properly now,
// matching (tabs)/_layout.tsx's own `56 + insets.bottom` tab-bar-height
// formula exactly (keep the two in sync if that formula ever changes)
// plus a real ~52px clearance target (mid of the founder's 48-56px band).
const TAB_BAR_BASE_HEIGHT = 56
const TAB_BAR_CLEARANCE = 52
// Systemic rule (2026-07-27): no text or glow is ever legible under the
// navbar — content that scrolls toward it, OR toward a pinned block
// sitting above it, must be fully dissolved first. Ceiling raised from
// the mockup's own 0.6 (a deliberate departure — logged in
// MOBILE_ALPHA_REDESIGN.md the same way as the other departures: the
// mockup is a static render that never exercised live scrolled text
// against this boundary, so its own value was never tested against the
// case it exists to solve) to 0.92, ramping fully opaque-to-transparent
// over 85% of the fade band's height — same recipe (tabs)/_layout.tsx's
// NavFade uses, reused here for the fade sitting above a pinned block.
const FADE_STOPS = { peakOpacity: 0.92, transparentAt: '85%' } as const
const PINNED_FADE_HEIGHT = 70

export function ScreenShell({
  children,
  temperature = 'neutral',
  pinnedBottom,
  // Founder correction (this batch) — the Stack header (box + back
  // button + shadow line) is gone on every pushed screen; opt-in here
  // rather than always-on because ScreenShell also backs the three TAB
  // roots (Днес/Карта/Ритъм), which have no "back" to offer.
  back = false,
  // Founder correction (this batch) — moon-detail is the one ScreenShell
  // consumer that lives outside the (tabs) group, so it never got the
  // AmbientBackground the three tab roots already share (mounted once at
  // (tabs)/_layout.tsx, above all of them). Opt-in for the same reason
  // `back` is: mounting it unconditionally here would double-render stars
  // behind Днес/Карта/Ритъм.
  stars = false,
  // TEMPORARY (2026-07-27) — item 1 investigation only, lets a call site
  // re-measure content position on demand while scrolled (onLayout alone
  // only fires on mount/relayout, not on scroll). Delete once that
  // investigation has an answer.
  onScroll,
}: {
  children: ReactNode
  temperature?: Temperature
  pinnedBottom?: ReactNode
  back?: boolean
  stars?: boolean
  onScroll?: ComponentProps<typeof ScrollView>['onScroll']
}) {
  const insets = useSafeAreaInsets()
  const [shellSize, setShellSize] = useState({ width: 0, height: 0 })
  const [pinnedHeight, setPinnedHeight] = useState(0)
  const washLayers = WASH_SPEC[temperature]
  const tabBarClearance = TAB_BAR_BASE_HEIGHT + insets.bottom + TAB_BAR_CLEARANCE
  const backVisibility = useBackButtonVisibility()

  const onShellLayout = (e: LayoutChangeEvent) =>
    setShellSize({ width: e.nativeEvent.layout.width, height: e.nativeEvent.layout.height })
  // Measures the pinned block's OWN rendered height — its content is
  // responsible for making that height include everything visually
  // painted (glow included; see CtaPanel.tsx's paddingVertical fix for
  // why a glow that overflows its layout box breaks this measurement).
  const onPinnedLayout = (e: LayoutChangeEvent) => {
    setPinnedHeight(e.nativeEvent.layout.height)
    // PIPELINE MARKER (2026-07-28) — top of the CtaPanel tree capture,
    // one level above the Pressable.
    // eslint-disable-next-line no-console
    console.log('[PIPELINE-MARKER][tree] pinnedBottom wrapper View', e.nativeEvent.layout)
  }

  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: 'transparent' }} onLayout={onShellLayout}>
      {stars && PERF_DEBUG.ambientStarfield && <AmbientBackground />}
      {back && (
        <Animated.View
          style={[{ position: 'absolute', top: 0, left: 0, zIndex: 10 }, backVisibility.style]}
          pointerEvents={backVisibility.pointerEvents}
        >
          <BackButton />
        </Animated.View>
      )}
      {/* BUG FIX (founder device-pass, 2026-07-27): this was capped at a
          fixed 220px tall, inherited unchanged from the pre-Stage-2 shell
          that only ever drew a top-corner glow. The mockup's `.warm-wash`/
          `.cool-wash` is `inset:0` — full screen — and WASH_SPEC's warm
          bottom-right ellipse sits at cy:82%, which inside a 220px box
          lands ~180px from the top and never reaches anywhere near the
          actual bottom of a 700px+ scrolled screen. Netted out to "no
          bronze wash visible at all" on a real device/render — silent,
          not a crash, so it went unnoticed in the diff and only showed up
          on an actual screenshot. Fixed by filling the whole shell instead
          of a fixed pixel height, and positioning is now measured (this
          layout's own width/height), not guessed. */}
      {PERF_DEBUG.screenShellWash && shellSize.width > 0 && (
        <Svg
          width={shellSize.width}
          height={shellSize.height}
          style={{ position: 'absolute', top: 0, left: 0 }}
          pointerEvents="none"
        >
          <Defs>
            {washLayers.map((layer, i) => (
              <RadialGradient key={i} id={`shell-wash-${i}`} cx="50%" cy="50%" r="50%">
                <Stop offset="0%" stopColor={layer.color} stopOpacity={layer.opacity} />
                <Stop offset="100%" stopColor={layer.color} stopOpacity={0} />
              </RadialGradient>
            ))}
          </Defs>
          {washLayers.map((layer, i) => (
            <Ellipse
              key={i}
              cx={layer.cxPct * shellSize.width}
              cy={layer.cyPct * shellSize.height}
              rx={layer.rx}
              ry={layer.ry}
              fill={`url(#shell-wash-${i})`}
            />
          ))}
        </Svg>
      )}
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{
          paddingHorizontal: space.xl,
          paddingTop: space.xl,
          // Reserves space for the tab bar's own clearance, PLUS the
          // pinned block's full measured height when there is one — the
          // pinned block sits ABOVE that clearance band, so scrolled
          // content needs to clear both to avoid ending up hidden behind
          // either.
          paddingBottom: tabBarClearance + (pinnedBottom ? pinnedHeight : 0),
        }}
        onScroll={(e: NativeSyntheticEvent<NativeScrollEvent>) => {
          onScroll?.(e)
          if (back) backVisibility.onScroll(e)
        }}
        scrollEventThrottle={onScroll || back ? 100 : undefined}
      >
        {children}
      </ScrollView>
      {pinnedBottom && (
        <>
          {/* Dissolves scrolled content before it reaches the pinned
              block's own top edge — same systemic rule as NavFade below
              the tab bar (no text/glow ever legible under persistent
              chrome), applied here because the pinned block is ALSO
              persistent chrome from the scrolling content's perspective. */}
          <Svg
            width={shellSize.width}
            height={PINNED_FADE_HEIGHT}
            style={{ position: 'absolute', left: 0, right: 0, bottom: tabBarClearance + pinnedHeight }}
            pointerEvents="none"
          >
            <Defs>
              <LinearGradient id="pinned-fade" x1="0%" y1="100%" x2="0%" y2="0%">
                <Stop offset="0%" stopColor="#08060f" stopOpacity={FADE_STOPS.peakOpacity} />
                <Stop offset={FADE_STOPS.transparentAt} stopColor="#08060f" stopOpacity={0} />
              </LinearGradient>
            </Defs>
            <Rect width="100%" height="100%" fill="url(#pinned-fade)" />
          </Svg>
          <View
            onLayout={onPinnedLayout}
            style={{ position: 'absolute', left: 0, right: 0, bottom: tabBarClearance, paddingHorizontal: space.xl }}
            pointerEvents="box-none"
          >
            {pinnedBottom}
          </View>
        </>
      )}
    </SafeAreaView>
  )
}
