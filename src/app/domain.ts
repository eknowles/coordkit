import { Schema } from 'effect'
import { defineTaggedUnion } from 'foldkit/schema'

import { defaultGridToggles } from '../systems/registry'

export const LatLon = Schema.Struct({ lat: Schema.Number, lon: Schema.Number })
export type LatLon = typeof LatLon.Type

export const Bounds = Schema.Struct({
  west: Schema.Number,
  south: Schema.Number,
  east: Schema.Number,
  north: Schema.Number,
})
export type Bounds = typeof Bounds.Type

export const MapView = Schema.Struct({ bounds: Bounds, zoom: Schema.Number })
export type MapView = typeof MapView.Type

export const Basemap = Schema.Literals(['Dark', 'Light', 'Satellite'])
export type Basemap = typeof Basemap.Type

export const Projection = Schema.Literals(['Globe', 'Mercator'])
export type Projection = typeof Projection.Type

export const MgrsPrecision = Schema.Literals([5, 4, 3, 2, 1, 0])
export type MgrsPrecision = typeof MgrsPrecision.Type

export const GarsPrecision = Schema.Literals([5, 15, 30])
export type GarsPrecision = typeof GarsPrecision.Type

/** Grid ids come from the systems registry; a grid missing from the record uses its own default. */
export const GridToggles = Schema.Record(Schema.String, Schema.Boolean)
export type GridToggles = typeof GridToggles.Type

/** Ring spacing in the ring unit, as a string so the select can carry it. */
export const RingSpacing = Schema.Literals(['Auto', '0.25', '0.5', '1', '2', '5', '10', '25', '50', '100'])
export type RingSpacing = typeof RingSpacing.Type

export const RingUnit = Schema.Literals(['NauticalMiles', 'Kilometres'])
export type RingUnit = typeof RingUnit.Type

export const Settings = Schema.Struct({
  grids: GridToggles,
  showLabels: Schema.Boolean,
  basemap: Basemap,
  projection: Projection,
  mgrsPrecision: MgrsPrecision,
  garsPrecision: GarsPrecision,
  showRings: Schema.Boolean,
  ringSpacing: RingSpacing,
  ringUnit: RingUnit,
})
export type Settings = typeof Settings.Type

export const defaultSettings: Settings = {
  grids: defaultGridToggles(),
  showLabels: true,
  basemap: 'Satellite',
  projection: 'Mercator',
  mgrsPrecision: 0,
  garsPrecision: 30,
  showRings: true,
  ringSpacing: 'Auto',
  ringUnit: 'NauticalMiles',
}

export const Target = Schema.Literals(['Cursor', 'Cue'])
export type Target = typeof Target.Type

export const CopiedCell = Schema.Struct({ systemId: Schema.String, target: Target })
export type CopiedCell = typeof CopiedCell.Type

export const MapState = defineTaggedUnion({
  Loading: {},
  Ready: { hostId: Schema.String },
  Failed: { reason: Schema.String },
})
export type MapState = typeof MapState.Type

export const SearchState = defineTaggedUnion({
  Idle: {},
  Found: { kind: Schema.String },
  Failed: { reason: Schema.String },
})
export type SearchState = typeof SearchState.Type

/** Compact turns the readout so systems run down the screen instead of across it. */
export const Layout = Schema.Literals(['Wide', 'Compact'])
export type Layout = typeof Layout.Type

/** Touch screens cannot hover, so there is no cursor position to report. */
export const Pointer = Schema.Literals(['Hover', 'Touch'])
export type Pointer = typeof Pointer.Type

export const CursorState = defineTaggedUnion({
  Idle: {},
  OnMap: { point: LatLon },
  OffMap: { point: LatLon },
})
export type CursorState = typeof CursorState.Type
