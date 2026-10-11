/**
 * Geodesic direct problem on WGS84 (Vincenty, 1975): the point at a distance and
 * initial bearing from a start point. Accurate to well under a millimetre.
 */
import { DEG, type LatLon, RAD, WGS84, b, wrapLon } from './ellipsoid'

export const METRES_PER_NAUTICAL_MILE = 1852

const { a, f } = WGS84

/** Destination from `start` after `distance` metres on initial bearing `bearing` degrees from true north. */
export function destination(
  start: LatLon,
  bearing: number,
  distance: number,
): LatLon {
  const alpha1 = bearing * DEG
  const sinAlpha1 = Math.sin(alpha1)
  const cosAlpha1 = Math.cos(alpha1)

  const tanU1 = (1 - f) * Math.tan(start.lat * DEG)
  const cosU1 = 1 / Math.sqrt(1 + tanU1 * tanU1)
  const sinU1 = tanU1 * cosU1
  const sigma1 = Math.atan2(tanU1, cosAlpha1)
  const sinAlpha = cosU1 * sinAlpha1
  const cosSqAlpha = 1 - sinAlpha * sinAlpha
  const uSq = (cosSqAlpha * (a * a - b * b)) / (b * b)
  const A = 1 + (uSq / 16384) * (4096 + uSq * (-768 + uSq * (320 - 175 * uSq)))
  const B = (uSq / 1024) * (256 + uSq * (-128 + uSq * (74 - 47 * uSq)))

  let sigma = distance / (b * A)
  let cos2SigmaM = 0
  let sinSigma = 0
  let cosSigma = 0
  for (let i = 0; i < 100; i++) {
    cos2SigmaM = Math.cos(2 * sigma1 + sigma)
    sinSigma = Math.sin(sigma)
    cosSigma = Math.cos(sigma)
    const deltaSigma =
      B *
      sinSigma *
      (cos2SigmaM +
        (B / 4) *
          (cosSigma * (-1 + 2 * cos2SigmaM * cos2SigmaM) -
            (B / 6) *
              cos2SigmaM *
              (-3 + 4 * sinSigma * sinSigma) *
              (-3 + 4 * cos2SigmaM * cos2SigmaM)))
    const next = distance / (b * A) + deltaSigma
    const converged = Math.abs(next - sigma) < 1e-12
    sigma = next
    if (converged) break
  }
  sinSigma = Math.sin(sigma)
  cosSigma = Math.cos(sigma)
  cos2SigmaM = Math.cos(2 * sigma1 + sigma)

  const x = sinU1 * sinSigma - cosU1 * cosSigma * cosAlpha1
  const lat2 = Math.atan2(
    sinU1 * cosSigma + cosU1 * sinSigma * cosAlpha1,
    (1 - f) * Math.sqrt(sinAlpha * sinAlpha + x * x),
  )
  const lambda = Math.atan2(
    sinSigma * sinAlpha1,
    cosU1 * cosSigma - sinU1 * sinSigma * cosAlpha1,
  )
  const C = (f / 16) * cosSqAlpha * (4 + f * (4 - 3 * cosSqAlpha))
  const L =
    lambda -
    (1 - C) *
      f *
      sinAlpha *
      (sigma +
        C *
          sinSigma *
          (cos2SigmaM + C * cosSigma * (-1 + 2 * cos2SigmaM * cos2SigmaM)))

  return { lat: lat2 * RAD, lon: wrapLon(start.lon + L * RAD) }
}
