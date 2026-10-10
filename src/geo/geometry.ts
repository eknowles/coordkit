/** Shared planar geometry for grid overlays. Positions are [lon, lat] in degrees. */
import type { LatLon } from "./ellipsoid";

export type Position = [number, number];
export type RGBA = [number, number, number, number];

export interface GridPath {
  path: Position[];
  width: number;
}

export interface GridLabel {
  position: Position;
  text: string;
  size: number;
}

export interface GridGeometry {
  paths: GridPath[];
  labels: GridLabel[];
}

export const emptyGrid = (): GridGeometry => ({ paths: [], labels: [] });

/** Box as [west, south, east, north]. */
export type Box = [number, number, number, number];

export function intersectBoxes(a: Box, b: Box): Box | null {
  const w = Math.max(a[0], b[0]);
  const s = Math.max(a[1], b[1]);
  const e = Math.min(a[2], b[2]);
  const n = Math.min(a[3], b[3]);
  return w < e && s < n ? [w, s, e, n] : null;
}

export function inBox(p: LatLon, b: Box): boolean {
  return p.lon >= b[0] && p.lon <= b[2] && p.lat >= b[1] && p.lat <= b[3];
}

/** Rectangle outline, densified so parallels follow the globe. */
export function boxPath([w, s, e, n]: Box, step = 1): Position[] {
  const pts: Position[] = [];
  const nx = Math.max(1, Math.ceil((e - w) / step));
  const ny = Math.max(1, Math.ceil((n - s) / step));
  for (let i = 0; i <= nx; i++) pts.push([w + ((e - w) * i) / nx, s]);
  for (let i = 1; i <= ny; i++) pts.push([e, s + ((n - s) * i) / ny]);
  for (let i = 1; i <= nx; i++) pts.push([e - ((e - w) * i) / nx, n]);
  for (let i = 1; i <= ny; i++) pts.push([w, n - ((n - s) * i) / ny]);
  return pts;
}

export function densify(a: Position, b: Position, step: number): Position[] {
  const len = Math.hypot(b[0] - a[0], b[1] - a[1]);
  const k = Math.max(1, Math.ceil(len / step));
  const out: Position[] = [];
  for (let i = 0; i <= k; i++) out.push([a[0] + ((b[0] - a[0]) * i) / k, a[1] + ((b[1] - a[1]) * i) / k]);
  return out;
}
