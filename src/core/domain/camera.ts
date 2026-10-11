import {
  Array,
  Number as EffectNumber,
  Option,
  Schema,
  String,
  pipe,
} from 'effect'

import { LatLon, clampToWorld } from './latLon'

/** Where the map is looking. Bounds are derived by the map from these and its size. */
export const Camera = Schema.Struct({
  center: LatLon,
  zoom: Schema.Finite,
  bearing: Schema.Finite,
  pitch: Schema.Finite,
})
export type Camera = typeof Camera.Type

const DEGREE_TOLERANCE = 1e-6
const ZOOM_TOLERANCE = 1e-3

/** Whether two cameras show the same view, within rounding. */
export const isSameView = (left: Camera, right: Camera): boolean =>
  Math.abs(left.center.lat - right.center.lat) < DEGREE_TOLERANCE &&
  Math.abs(left.center.lon - right.center.lon) < DEGREE_TOLERANCE &&
  Math.abs(left.zoom - right.zoom) < ZOOM_TOLERANCE &&
  Math.abs(left.bearing - right.bearing) < DEGREE_TOLERANCE &&
  Math.abs(left.pitch - right.pitch) < DEGREE_TOLERANCE

const ZOOM_DECIMALS = 2
const DEGREE_DECIMALS = 5

/** The URL form `zoom/lat/lon/bearing/pitch`, matching MapLibre's own hash. */
export const toUrlValue = ({ center, zoom, bearing, pitch }: Camera): string =>
  [
    zoom.toFixed(ZOOM_DECIMALS),
    center.lat.toFixed(DEGREE_DECIMALS),
    center.lon.toFixed(DEGREE_DECIMALS),
    bearing.toFixed(1),
    pitch.toFixed(1),
  ].join('/')

const MAX_ZOOM = 24
const MAX_PITCH = 85

const isNumberText = (part: string): boolean =>
  String.isNonEmpty(part) && globalThis.Number.isFinite(globalThis.Number(part))

/**
 * Read `zoom/lat/lon` with optional `/bearing/pitch`. A shared link can hold anything, so the
 * values are clamped to what MapLibre accepts; MapLibre throws on a latitude past the poles.
 */
export const fromUrlValue = (value: string): Option.Option<Camera> =>
  pipe(
    value.split('/'),
    Option.liftPredicate(
      parts =>
        parts.length >= 3 &&
        parts.length <= 5 &&
        Array.every(parts, isNumberText),
    ),
    Option.map(Array.map(part => globalThis.Number(part))),
    Option.map(([zoom = 0, lat = 0, lon = 0, bearing = 0, pitch = 0]) => ({
      center: clampToWorld({ lat, lon }),
      zoom: EffectNumber.clamp(zoom, { minimum: 0, maximum: MAX_ZOOM }),
      bearing,
      pitch: EffectNumber.clamp(pitch, { minimum: 0, maximum: MAX_PITCH }),
    })),
  )
