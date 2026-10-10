import { Number, Schema } from 'effect'

import type * as Geo from '../geo/ellipsoid'
import { wrapLon } from '../geo/ellipsoid'

/** A WGS84 position. The maths layer (src/geo) declares the same shape without Effect. */
export const LatLon = Schema.Struct({ lat: Schema.Number, lon: Schema.Number })
export type LatLon = typeof LatLon.Type

// NOTE: compile-time check that this Schema and the maths layer's LatLon stay the same shape.
export const toGeo = (point: LatLon): Geo.LatLon => point

const MAX_LATITUDE = 90

/** Clamp the latitude to the poles and wrap the longitude into [-180, 180). */
export const clampToWorld = (point: LatLon): LatLon => ({
  lat: Number.clamp(point.lat, {
    minimum: -MAX_LATITUDE,
    maximum: MAX_LATITUDE,
  }),
  lon: wrapLon(point.lon),
})
