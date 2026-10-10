/** WGS84 ellipsoid constants. */
export const WGS84 = {
  a: 6378137.0,
  f: 1 / 298.257223563,
} as const;

export const b = WGS84.a * (1 - WGS84.f);
export const e2 = WGS84.f * (2 - WGS84.f);
export const e = Math.sqrt(e2);

export const DEG = Math.PI / 180;
export const RAD = 180 / Math.PI;

export interface LatLon {
  lat: number;
  lon: number;
}

/** Wrap a longitude into [-180, 180). */
export function wrapLon(lon: number): number {
  if (lon >= -180 && lon < 180) return lon;
  const w = ((((lon + 180) % 360) + 360) % 360) - 180;
  return w === -180 && lon > 0 ? 180 - 1e-12 : w;
}

export function isValidLatLon(p: LatLon): boolean {
  return (
    Number.isFinite(p.lat) &&
    Number.isFinite(p.lon) &&
    p.lat >= -90 &&
    p.lat <= 90 &&
    p.lon >= -180 &&
    p.lon <= 180
  );
}
