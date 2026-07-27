// TEMPORARY — perf bisection only (2026-07-27). All 4 freeze* flags below
// default to `true` (frozen) — this is the already-confirmed 60fps
// baseline. Flip exactly ONE to `false` to ENABLE that one animation from
// a clean baseline, reload on device, read UI FPS off the perf monitor,
// flip it back to `true` before moving to the next one. This is
// leave-one-IN, not leave-one-out: starting from all-frozen and enabling
// one at a time means each reading is that animation's cost in isolation
// and can't be masked by a second animation also running. Delete this
// whole file (and its call sites) once the bisection is done — not a
// permanent feature flag.
//
// Confirmed (2026-07-27): freezing ALL of these at once took UI FPS from
// 10-15 to a locked 60 on every screen, with every layer still mounted —
// this is redraw (animated props inside full-viewport <Svg> forcing a
// full-canvas re-rasterize every frame), not overdraw from layer count.
// These 4 flags split that single freezeAnimations switch apart so each
// animation can be measured in isolation to find which one(s) dominate.
//
// Prediction to check the readings against: freezeResolveIn gates two
// ONE-SHOT fades (fire on mount, then idle) — NatalWheel's graticule and
// motion.ts's useResolveIn. Neither can cause a *sustained* low FPS by
// mechanism. If enabling it alone still drops FPS, that points to
// repeated remounting (a different bug), not per-frame redraw cost —
// flag that back rather than chasing a redraw fix for it.
export const PERF_DEBUG = {
  // AmbientBackground.tsx — TwinkleGroup (4 animated star groups inside
  // the full-viewport starfield Svg).
  freezeStarTwinkle: false,
  // MoonGlyph.tsx — the glow pulse behind the moon disk.
  freezeMoonGlowPulse: false,
  // motion.ts useBreathe — shared breathing-ember hook.
  freezeBreathe: false,
  // motion.ts useResolveIn + NatalWheel.tsx's graticule — one-shot
  // "resolve into focus" fades. Grouped together: both are one-shot
  // (fire once on mount, then idle), not continuous loops. See the
  // prediction above — expected to read as a null result.
  freezeResolveIn: false,
  screenShellWash: true, // ScreenShell.tsx — full-screen warm/cool gradient wash
  ambientStarfield: true, // (tabs)/_layout.tsx — AmbientBackground starfield
  // navbarBlur removed (2026-07-27) — BlurView + solid fill deleted
  // outright (spec violation, not just a perf suspect), replaced with the
  // mockup's fade-only navbar. Nothing left there to bisect.
  moonHalo: true, // MoonGlyph.tsx — bloom Svg behind the moon disk
  moonDepthTwin: true, // MoonGlyph.tsx — the depth-double circle behind the disk
  moonTintCircles: true, // MoonGlyph.tsx — warm/cool near-far light circles
  wheelFrameGradients: true, // NatalWheelFrame.tsx — rim/face/gem-fill Defs
}

// wheelScrollTest (2026-07-27, removed) — isolating test confirmed the
// wheel's Svg tree as the scroll-stutter mechanism (smooth with a
// placeholder View, stutters with the real wheel). Fix shipped in
// chart.tsx/WheelArrivalContainer.tsx: rasterize-to-bitmap
// (shouldRasterizeIOS/renderToHardwareTextureAndroid), gated on the
// arrival animation having settled.
