/**
 * Inline Placidus house-cusp implementation (Tier 3 reference).
 *
 * Scope-honesty per 09-01-HARNESS.md § Tier 3:
 *   This check compares sweph's Placidus output against an independent
 *   implementation of the same Placidus formulas (Meeus Ch. 12-13 for RAMC /
 *   MC / ASC; classic Placidus semi-arc trisection for cusps 11/12/2/3).
 *   Passing means sweph's Placidus code is transcribed/implemented correctly.
 *   Passing does NOT validate the Placidus method's agreement with physical
 *   reality — Placidus is a mathematical construction, not observational.
 *   All "correctness" claims for houses here are code-path-integrity claims.
 *
 * NOT a network fetch. Pure TypeScript computation; no external data files.
 * Computed at comparison time from each case's (JD, lat, lon).
 *
 * References:
 *   - Meeus, J. "Astronomical Algorithms" (2nd ed.), Ch. 12 (sidereal time),
 *     Ch. 22 (obliquity), Ch. 13 (MC / ASC from RAMC, ε, φ).
 *   - Placidus intermediate cusps: semi-arc trisection,
 *     RA_k = RAMC + offset + DSA(D_k)/divisor, iterated to 1e-7 rad tolerance.
 */

const DEG = Math.PI / 180
const RAD = 180 / Math.PI

function normalizeDeg(d: number): number {
  return ((d % 360) + 360) % 360
}

/** Meeus AA eq 22.2 — mean obliquity of the ecliptic (radians). */
function meanObliquityRad(jd: number): number {
  const t = (jd - 2451545) / 36525
  const epsDeg =
    23.43929111 -
    0.013004167 * t -
    0.000000164 * t * t +
    0.00000050361 * t * t * t
  return epsDeg * DEG
}

/**
 * Meeus AA Ch. 22 — nutation in longitude (Δψ) and obliquity (Δε), in arcseconds.
 * Dominant four terms only — adequate to sub-arcsec for modern dates, which is
 * the scope of §9 validation. Higher-order terms drop below 0.5″.
 */
function nutationArcsec(jd: number): { dpsi: number; deps: number } {
  const t = (jd - 2451545) / 36525
  const omega = (125.04452 - 1934.136261 * t) * DEG
  const L = (280.4665 + 36000.7698 * t) * DEG
  const Lp = (218.3165 + 481267.8813 * t) * DEG
  const dpsi =
    -17.2 * Math.sin(omega) -
    1.32 * Math.sin(2 * L) -
    0.23 * Math.sin(2 * Lp) +
    0.21 * Math.sin(2 * omega)
  const deps =
    9.2 * Math.cos(omega) +
    0.57 * Math.cos(2 * L) +
    0.1 * Math.cos(2 * Lp) -
    0.09 * Math.cos(2 * omega)
  return { dpsi, deps }
}

/** True obliquity — mean obliquity plus nutation in obliquity. */
function trueObliquityRad(jd: number): number {
  const mean = meanObliquityRad(jd)
  const { deps } = nutationArcsec(jd)
  return mean + (deps / 3600) * DEG
}

/** Meeus AA eq 12.4 — Greenwich mean sidereal time in degrees [0, 360). */
function greenwichMeanSiderealTimeDeg(jd: number): number {
  const t = (jd - 2451545) / 36525
  const theta =
    280.46061837 +
    360.98564736629 * (jd - 2451545) +
    0.000387933 * t * t -
    (t * t * t) / 38710000
  return normalizeDeg(theta)
}

/** Greenwich apparent sidereal time — GMST plus the equation of the equinoxes. */
function greenwichApparentSiderealTimeDeg(jd: number): number {
  const gmst = greenwichMeanSiderealTimeDeg(jd)
  const { dpsi } = nutationArcsec(jd)
  const eps = trueObliquityRad(jd)
  // Equation of the equinoxes: Δψ cos(ε) in arcsec, converted to degrees.
  const eqEq = ((dpsi / 3600) * Math.cos(eps))
  return normalizeDeg(gmst + eqEq)
}

/** MC ecliptic longitude from RAMC and obliquity (Meeus Ch. 13). */
function mcLongitudeDeg(ramcDeg: number, epsRad: number): number {
  const ramcRad = ramcDeg * DEG
  const lamRad = Math.atan2(Math.sin(ramcRad), Math.cos(ramcRad) * Math.cos(epsRad))
  return normalizeDeg(lamRad * RAD)
}

/** Ascendant ecliptic longitude from RAMC, obliquity, geographic latitude (Meeus Ch. 13).
 *
 * Formula: λ_ASC = atan2(cos(RAMC), -(sin(ε) tan(φ) + cos(ε) sin(RAMC))).
 * Hemisphere check: ASC must be 0-180° "ahead of" MC in ecliptic longitude
 * (counter-clockwise in chart = increasing longitude). If the atan2 branch
 * picks the antipode, add 180°.
 */
function ascendantLongitudeDeg(ramcDeg: number, epsRad: number, phiRad: number): number {
  const ramcRad = ramcDeg * DEG
  const num = Math.cos(ramcRad)
  const den = -(Math.sin(epsRad) * Math.tan(phiRad) + Math.cos(epsRad) * Math.sin(ramcRad))
  let ascDeg = normalizeDeg(Math.atan2(num, den) * RAD)
  const mcDeg = mcLongitudeDeg(ramcDeg, epsRad)
  if (normalizeDeg(ascDeg - mcDeg) > 180) {
    ascDeg = normalizeDeg(ascDeg + 180)
  }
  return ascDeg
}

/**
 * Iteratively compute an intermediate Placidus cusp from its semi-arc offset.
 * Initial guess uses D=0 (equator approximation); iterates using
 * DSA(D) = arccos(-tan(φ) tan(D)) until convergence or max iterations.
 */
function placidusIntermediateCuspDeg(
  cusp: 11 | 12 | 2 | 3,
  ramcDeg: number,
  epsRad: number,
  phiRad: number,
): number {
  // For each cusp: RA = RAMC + baseOffset + DSA(D) / divisor
  //   cusp 11 (1/3 from MC toward ASC):  base=0,   divisor=3
  //   cusp 12 (2/3 from MC toward ASC):  base=0,   divisor=1.5
  //   cusp 2  (1/3 past ASC toward IC):  base=60,  divisor=1.5
  //   cusp 3  (2/3 past ASC toward IC):  base=120, divisor=3
  const config = {
    11: { baseOffset: 0, divisor: 3 },
    12: { baseOffset: 0, divisor: 1.5 },
    2: { baseOffset: 60, divisor: 1.5 },
    3: { baseOffset: 120, divisor: 3 },
  }[cusp]

  let raDeg = ramcDeg + config.baseOffset + 90 / config.divisor
  for (let iter = 0; iter < 30; iter++) {
    const raRad = raDeg * DEG
    const lamRad = Math.atan2(Math.sin(raRad), Math.cos(raRad) * Math.cos(epsRad))
    const dRad = Math.asin(Math.sin(epsRad) * Math.sin(lamRad))
    const tanPhiTanD = Math.tan(phiRad) * Math.tan(dRad)
    if (Math.abs(tanPhiTanD) >= 1) {
      // Polar-circle degenerate case — DSA undefined. Return NaN; caller handles.
      return Number.NaN
    }
    const dsaDeg = Math.acos(-tanPhiTanD) * RAD
    const newRaDeg = ramcDeg + config.baseOffset + dsaDeg / config.divisor
    if (Math.abs(newRaDeg - raDeg) < 1e-9) {
      raDeg = newRaDeg
      break
    }
    raDeg = newRaDeg
  }

  const raRad = raDeg * DEG
  const lamDeg = Math.atan2(Math.sin(raRad), Math.cos(raRad) * Math.cos(epsRad)) * RAD
  return normalizeDeg(lamDeg)
}

export interface PlacidusResult {
  ascendant: number
  mc: number
  cusps: number[] // length 12, cusps 1..12 in ecliptic longitude
}

/** Compute Placidus house cusps + ASC + MC from Julian Day and observer lat/lon. */
export function computePlacidusCusps(
  jd: number,
  latDeg: number,
  lonDeg: number,
): PlacidusResult {
  // Apparent sidereal time (GMST + equation of the equinoxes) and true
  // obliquity (mean + nutation). sweph uses these same apparent/true
  // quantities; matching reduces residual to sub-arcsec.
  const gast = greenwichApparentSiderealTimeDeg(jd)
  const ramcDeg = normalizeDeg(gast + lonDeg)
  const epsRad = trueObliquityRad(jd)
  const phiRad = latDeg * DEG

  const mc = mcLongitudeDeg(ramcDeg, epsRad)
  const asc = ascendantLongitudeDeg(ramcDeg, epsRad, phiRad)

  const cusp11 = placidusIntermediateCuspDeg(11, ramcDeg, epsRad, phiRad)
  const cusp12 = placidusIntermediateCuspDeg(12, ramcDeg, epsRad, phiRad)
  const cusp2 = placidusIntermediateCuspDeg(2, ramcDeg, epsRad, phiRad)
  const cusp3 = placidusIntermediateCuspDeg(3, ramcDeg, epsRad, phiRad)

  const cusps: number[] = new Array(12)
  cusps[0] = asc // 1
  cusps[1] = cusp2 // 2
  cusps[2] = cusp3 // 3
  cusps[3] = normalizeDeg(mc + 180) // 4 = IC
  cusps[4] = normalizeDeg(cusp11 + 180) // 5 opposite cusp 11
  cusps[5] = normalizeDeg(cusp12 + 180) // 6 opposite cusp 12
  cusps[6] = normalizeDeg(asc + 180) // 7 = DSC
  cusps[7] = normalizeDeg(cusp2 + 180) // 8 opposite cusp 2
  cusps[8] = normalizeDeg(cusp3 + 180) // 9 opposite cusp 3
  cusps[9] = mc // 10 = MC
  cusps[10] = cusp11 // 11
  cusps[11] = cusp12 // 12

  return { ascendant: asc, mc, cusps }
}
