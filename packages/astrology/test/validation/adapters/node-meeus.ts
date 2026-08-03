/**
 * Mean Node Meeus Ch. 47 polynomial (Tier 2 reference).
 *
 * Scope of Node validation: this check compares sweph's Mean Node output
 * against an independent implementation of Meeus Ch. 47's polynomial for
 * ELP2000-85's secular mean node. Passing means sweph's polynomial code is
 * transcribed/implemented correctly. Passing does NOT validate the
 * polynomial's agreement with physical reality — the underlying ELP2000-85
 * model's ~20″ fit to lunar laser ranging observations is trusted, not
 * tested. Unlike the planet/Moon checks (which anchor on JPL Horizons, a
 * physical-reality reference), this is a code-path integrity check against
 * the same mathematical formula sweph uses.
 *
 * Source: Meeus, J. "Astronomical Algorithms" (2nd ed.), Ch. 47 eq 47.7
 *   Ω = 125.0445479 − 1934.1362891 T + 0.0020754 T² + T³/467441 − T⁴/60616000
 *   where T = (JD − 2451545) / 36525 centuries since J2000.0.
 * Normalized to [0, 360).
 *
 * NOT a network fetch or an external dependency. Pure ~5 lines of
 * arithmetic. Computed at comparison time from the case's JD.
 */

/** Longitude of the Moon's mean ascending node (Mean Node), degrees [0, 360). */
export function meanNodeLongitudeDeg(jd: number): number {
  const t = (jd - 2451545) / 36525
  const t2 = t * t
  const t3 = t2 * t
  const t4 = t3 * t
  const omega =
    125.0445479 -
    1934.1362891 * t +
    0.0020754 * t2 +
    t3 / 467441 -
    t4 / 60616000
  return ((omega % 360) + 360) % 360
}
