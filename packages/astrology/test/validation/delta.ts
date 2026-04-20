/**
 * Arc-second arithmetic and wrap-around-safe ecliptic-longitude delta.
 */

/**
 * Shortest-arc absolute difference between two ecliptic longitudes, in arc-seconds.
 *
 * Handles wrap-around at 0°/360°. Input in degrees (0-360 or any real — normalized internally).
 * Output in arc-seconds, always ≥ 0.
 *
 * At exactly 180° (antipodal), the ± sign is ambiguous; absolute value is 180° = 648000″.
 */
export function longitudeDeltaArcsec(a: number, b: number): number {
  const rawDiff = a - b
  const normalized = ((rawDiff + 540) % 360) - 180
  return Math.abs(normalized) * 3600
}

export function degreesToArcsec(degrees: number): number {
  return degrees * 3600
}

export function arcsecToDegrees(arcsec: number): number {
  return arcsec / 3600
}

/** Format arc-seconds into a compact human-readable string (e.g. "0.42″" or "1′ 23.4″"). */
export function formatArcsec(arcsec: number): string {
  const absolute = Math.abs(arcsec)
  if (absolute < 60) return `${arcsec.toFixed(2)}″`
  const minutes = Math.floor(absolute / 60)
  const seconds = absolute - minutes * 60
  const sign = arcsec < 0 ? '-' : ''
  return `${sign}${minutes}′ ${seconds.toFixed(1)}″`
}
