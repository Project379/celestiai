import Animated from 'react-native-reanimated'
import { Circle, Defs, G, Line, LinearGradient, RadialGradient, Stop } from 'react-native-svg'

import { color } from '@/components/design-system/tokens'

const AnimatedG = Animated.createAnimatedComponent(G)

// Stage 2 (2026-07-27) LOC split — extracted out of NatalWheel.tsx (proposed
// at investigation, not after the fact — see that file's header). This is
// the instrument's static furniture: rim, bezel, face, gem/glow defs, and
// the fixed-angle graticule — everything that doesn't depend on the actual
// chart data below it (zodiac segments, houses, aspects, planets stay in
// NatalWheel.tsx). Must render INSIDE the parent's own <Svg>/<Defs> tree
// (SVG defs are scoped per-document in react-native-svg the same as web),
// so this returns a fragment of Defs + shapes, not its own <Svg>.
export const GRATICULE_TICK_DEGREES = Array.from({ length: 12 }, (_, i) => i * 30)
export const GRATICULE_MAJOR_DEGREES = new Set([30, 90, 150, 210, 270, 330])

export function NatalWheelFrame({
  center,
  size,
  outerRadius,
  zodiacInnerRadius,
  houseInnerRadius,
  graticuleProps,
}: {
  center: number
  size: number
  outerRadius: number
  zodiacInnerRadius: number
  houseInnerRadius: number
  graticuleProps: { opacity?: number }
}) {
  return (
    <>
      <Defs>
        {/* Warm/cool amendment — the recovered-instrument bevel rim (the
            fitting a hand would touch), ported from the approved mockup's
            diagonal border-color bevel. Bronze, and ONLY the rim — the
            face/ticks/data stay cool, per the ratified "cold instrument,
            warm fittings" reading (WARM_COOL_AMENDMENT.md, corrected pass).
            Stage 2 (2026-07-27) correction against mockup `.inst-rim-outer`
            (_source-v4.html §КАРТА): the rim BODY is a solid #8a6339 —
            #d9a06a is reserved for the inset highlight only (mockup's
            `inset 0 1px 1px rgba(217,160,106,.22)` box-shadow), drawn below
            as a separate thin highlight stroke, not blended into the rim's
            own gradient. */}
        <LinearGradient id="rim-bevel" x1="15%" y1="8%" x2="85%" y2="92%">
          <Stop offset="0%" stopColor="#8a6339" />
          <Stop offset="50%" stopColor="#6b4b2a" />
          <Stop offset="100%" stopColor="#5c3f22" />
        </LinearGradient>
        {/* gem-fill / gem-fill-selected removed (2026-07-27) — Decision
            (a)'s uniform gem gradient is gone now that the founder
            inverted it; NatalWheel.tsx's gems use per-planet PLANET_COLORS
            solid fills again, no gradient def needed. */}
        {/* Etched instrument face — cool/neutral only, no bronze inside
            (rim is the only warm fitting). Without this the interior was
            just transparent SVG canvas — reads as an empty hole, not a
            recovered brass-and-glass face. */}
        <RadialGradient id="wheel-face" cx="50%" cy="38%" r="70%">
          <Stop offset="0%" stopColor="#1d1533" stopOpacity={0.55} />
          <Stop offset="60%" stopColor="#0f0b1c" stopOpacity={0.7} />
          <Stop offset="100%" stopColor="#08060f" stopOpacity={0.88} />
        </RadialGradient>
        {/* mockup `.inst-face`'s two off-axis patches — explicitly NOT
            circularly-symmetric per the founder's correction ("the earlier
            centered radial was wrong"): two small irregular highlight
            patches away from center, not a second concentric ring. */}
        <RadialGradient id="wheel-face-patch-1" cx="66%" cy="60%" r="60%">
          <Stop offset="0%" stopColor="#96b4dc" stopOpacity={0.05} />
          <Stop offset="100%" stopColor="#96b4dc" stopOpacity={0} />
        </RadialGradient>
        <RadialGradient id="wheel-face-patch-2" cx="30%" cy="70%" r="60%">
          <Stop offset="0%" stopColor={color.cool} stopOpacity={0.06} />
          <Stop offset="100%" stopColor={color.cool} stopOpacity={0} />
        </RadialGradient>
        {/* Shared gem-sheen highlight, reused per planet in NatalWheel.tsx
            — one def, not one per planet, since it's the same light
            source angle for every gem on the same face. */}
        <RadialGradient id="gem-sheen" cx="50%" cy="50%" r="50%">
          <Stop offset="0%" stopColor="#ffffff" stopOpacity={0.55} />
          <Stop offset="100%" stopColor="#ffffff" stopOpacity={0} />
        </RadialGradient>
      </Defs>
      {/* Outer ring border — the instrument's rim (solid bronze body) */}
      <Circle cx={center} cy={center} r={outerRadius} fill="none" stroke="url(#rim-bevel)" strokeWidth={size * 0.012} opacity={0.85} />
      {/* Inset highlight — #d9a06a, reserved for this only (mockup's inset
          box-shadow), not part of the rim body above. */}
      <Circle cx={center} cy={center} r={outerRadius - size * 0.008} fill="none" stroke="#d9a06a" strokeWidth={1} opacity={0.22} />
      {/* Separate bezel ring — mockup `.inst-bezel`, inset 5px on a 280px
          instrument (1.8% of diameter), cool/neutral, NOT bronze: a second
          distinct fitting from the rim, not a duplicate of it. */}
      <Circle cx={center} cy={center} r={outerRadius - size * 0.018} fill="none" stroke="rgba(180,200,230,0.22)" strokeWidth={1} />

      <Circle cx={center} cy={center} r={zodiacInnerRadius} fill="url(#wheel-face)" />
      <Circle cx={center} cy={center} r={zodiacInnerRadius} fill="url(#wheel-face-patch-1)" />
      <Circle cx={center} cy={center} r={zodiacInnerRadius} fill="url(#wheel-face-patch-2)" />
      {/* Two faint machining rings — material texture cheaply, no
          feTurbulence (grain stays deferred, see MoonGlyph.tsx). */}
      <Circle cx={center} cy={center} r={houseInnerRadius * 1.45} fill="none" stroke="rgba(91,143,199,0.12)" strokeWidth={1} />
      <Circle cx={center} cy={center} r={zodiacInnerRadius * 0.9} fill="none" stroke="rgba(91,143,199,0.08)" strokeWidth={1} />

      {/* Instrument graticule — the wheel's own measurement scale,
          cool-toned, fixed to the frame (not the rotating zodiac data).
          Resolves in once on mount (parent owns the shared value).
          Stage 2 correction against mockup `.etch-tick` rotations
          (_source-v4.html §КАРТА): exactly 12 ticks at 30° spacing (not 24
          at 15°), majors at the odd multiples of 30° — read directly off
          the mockup's `transform:rotate(...)` list. */}
      <AnimatedG animatedProps={graticuleProps}>
        {GRATICULE_TICK_DEGREES.map((deg, i) => {
          const major = GRATICULE_MAJOR_DEGREES.has(deg)
          const rad = ((deg - 90) * Math.PI) / 180
          const r1 = outerRadius + size * 0.003
          const r2 = outerRadius + size * (major ? 0.018 : 0.011)
          return (
            <Line
              key={`grat-${i}`}
              x1={center + Math.cos(rad) * r1}
              y1={center + Math.sin(rad) * r1}
              x2={center + Math.cos(rad) * r2}
              y2={center + Math.sin(rad) * r2}
              stroke={color.cool}
              strokeWidth={major ? 1.2 : 0.8}
              opacity={major ? 0.55 : 0.3}
            />
          )
        })}
      </AnimatedG>
    </>
  )
}
