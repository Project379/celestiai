/**
 * Per-launch in-memory state for the forced birth-data wizard "Пропусни засега"
 * dismissal (B.0g-3 / Path 2 hard-dismissable behavior).
 *
 * Lives at module scope so the dismissal clears on app re-launch (JS context
 * reset). Deliberately NOT AsyncStorage: per founder ratification 2026-05-12,
 * the forced wizard re-fires every app launch until a chart is created, so
 * dismissal is intentionally scoped to the current launch only.
 *
 * Read by (authed)/_layout.tsx to skip the auto-navigate when the user has
 * dismissed this launch. Written by the SkipWizardButton in the wizard header
 * after the user confirms «Пропусни засега».
 */

let wizardDismissedThisLaunch = false

export function markWizardDismissedThisLaunch(): void {
  wizardDismissedThisLaunch = true
}

export function isWizardDismissedThisLaunch(): boolean {
  return wizardDismissedThisLaunch
}
