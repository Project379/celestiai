/**
 * Runtime invariant assertions for "this can't be undefined but TS doesn't
 * know." Use sparingly — each call site documents "author claims this is
 * bounded by construction." If the assertion fires in production, it is a
 * bug in the caller's math, not a "normal" runtime error.
 *
 * Prefer this over `!` non-null assertions: the `!` operator silently
 * becomes `undefined` at runtime if the assertion is wrong, and tools like
 * `noUncheckedIndexedAccess` go quiet at the call site. These helpers throw
 * named errors that point at the specific bounded-access that was wrong.
 *
 * Introduced 2026-04-18 in Phase M2 after strict-mode in @stellaeum/core
 * surfaced the first post-M1 possibly-undefined sites. Retrofit:
 *   - packages/core/src/lib/moon-phase.ts (BOUNDARIES/MAJOR_EVENTS fallbacks)
 * replaced the ! assertions added in M1.
 */

export function first<T>(arr: readonly T[]): T {
  const item = arr[0]
  if (item === undefined) {
    throw new Error('Invariant violated: expected non-empty array')
  }
  return item
}

export function last<T>(arr: readonly T[]): T {
  const item = arr[arr.length - 1]
  if (item === undefined) {
    throw new Error('Invariant violated: expected non-empty array')
  }
  return item
}

export function at<T>(arr: readonly T[], index: number): T {
  const item = arr[index]
  if (item === undefined) {
    throw new Error(
      `Invariant violated: expected array index ${index} to exist (length ${arr.length})`,
    )
  }
  return item
}
