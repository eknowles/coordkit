/** Earth-centred, Earth-fixed Cartesian coordinates on WGS84. */
import { DEG, type LatLon, WGS84, e2 } from '../../geo/ellipsoid'

export function toEcef(
  { lat, lon }: LatLon,
  height = 0,
): { x: number; y: number; z: number } {
  const phi = lat * DEG
  const lam = lon * DEG
  const sinPhi = Math.sin(phi)
  const N = WGS84.a / Math.sqrt(1 - e2 * sinPhi * sinPhi)
  return {
    x: (N + height) * Math.cos(phi) * Math.cos(lam),
    y: (N + height) * Math.cos(phi) * Math.sin(lam),
    z: (N * (1 - e2) + height) * sinPhi,
  }
}
