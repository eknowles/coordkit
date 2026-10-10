/** Web Mercator (EPSG:3857), spherical, in metres. */
import { DEG, type LatLon, RAD, WGS84 } from '../../geo/ellipsoid'

export function toWebMercator({ lat, lon }: LatLon): { x: number; y: number } {
  const clamped = Math.max(-85.05112878, Math.min(85.05112878, lat))
  return {
    x: WGS84.a * lon * DEG,
    y: WGS84.a * Math.log(Math.tan(Math.PI / 4 + (clamped * DEG) / 2)),
  }
}

export function fromWebMercator(x: number, y: number): LatLon {
  return {
    lat: (2 * Math.atan(Math.exp(y / WGS84.a)) - Math.PI / 2) * RAD,
    lon: (x / WGS84.a) * RAD,
  }
}
