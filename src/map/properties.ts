import { Option, Record, Schema } from 'effect'

import {
  Camera,
  GridToggles,
  LatLon,
  MapStyle,
  RangeRings,
} from '../core/domain'
import { GarsPrecision } from '../core/systems/gars'
import { MgrsPrecision } from '../core/systems/mgrs'
import { TileZoom } from '../core/systems/tile'
import * as CameraRequest from './cameraRequest'

/**
 * The properties of `<coordkit-map>`, declared once. The element's TypeScript type and the
 * Foldkit binding (`CustomElement.define` in view.ts) are both derived from this record.
 */
export const mapPropertyFields = {
  basemap: MapStyle.Basemap,
  projection: MapStyle.Projection,
  gridToggles: GridToggles.GridToggles,
  isGridLabelsVisible: Schema.Boolean,
  cue: Schema.Option(LatLon.LatLon),
  mgrsPrecision: MgrsPrecision,
  garsPrecision: GarsPrecision,
  tileZoom: TileZoom,
  isRangeRingsVisible: Schema.Boolean,
  ringSpacing: RangeRings.RingSpacing,
  ringUnit: RangeRings.RingUnit,
  camera: Schema.Option(Camera.Camera),
  cameraRequest: Schema.Option(CameraRequest.CameraRequest),
}

export const MapProperties = Schema.Struct(mapPropertyFields)
export type MapProperties = typeof MapProperties.Type

export const mapPropertyNames = Record.keys(mapPropertyFields)

/** The CustomEvents `<coordkit-map>` dispatches, with the detail each carries. */
export const mapEventFields = {
  'map-ready': Schema.Struct({}),
  'map-failed': Schema.Struct({ reason: Schema.String }),
  'map-moved': Camera.Camera,
  'cursor-moved': LatLon.LatLon,
  'cursor-left': Schema.Struct({}),
  'map-clicked': LatLon.LatLon,
}

/**
 * What the element shows before the view first sets its properties. The view sets every
 * property on the first render, so these only matter for a bare element, as in tests.
 */
export const initialMapProperties: MapProperties = {
  basemap: 'Satellite',
  projection: 'Mercator',
  gridToggles: {},
  isGridLabelsVisible: true,
  cue: Option.none(),
  mgrsPrecision: 0,
  garsPrecision: 30,
  tileZoom: 12,
  isRangeRingsVisible: true,
  ringSpacing: 'Auto',
  ringUnit: 'NauticalMiles',
  camera: Option.none(),
  cameraRequest: Option.none(),
}
