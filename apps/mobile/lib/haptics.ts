import * as Haptics from 'expo-haptics'

// Shared haptic vocabulary (item 5, this batch) — two tiers only, per
// instruction ("nothing heavy"): Light impact marks an invitation firing
// (the lit-phrase primitives — CtaPanel/Pedestal — plus other screen-level
// "go do the next thing" taps), selection feedback marks picking among
// options that were already on screen (list rows, tab/toggle switches).
// NatalWheel.tsx's existing per-planet Medium impact predates this file and
// is a separate, already-founder-reviewed choice (a discrete "collision"
// with a precise tap target, not a list-row pick) — left as is, not
// widened into this vocabulary.
export function hapticInvite() {
  void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
}

export function hapticSelect() {
  void Haptics.selectionAsync()
}
