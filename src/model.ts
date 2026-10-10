import { Schema } from 'effect'
import { defineTaggedUnion } from 'foldkit/schema'

import * as Copy from './copy'
import { Camera, CameraRequest, LatLon, Viewport } from './domain'
import * as GoTo from './goTo'
import * as Settings from './settings'

/** Whether MapLibre is running. It fails without WebGL, or when the first style cannot load. */
export const MapState = defineTaggedUnion({
  Loading: {},
  Ready: {},
  Failed: { reason: Schema.String },
})
export type MapState = typeof MapState.Type

/** OffMap keeps the last point, so the readout can show it greyed out after the cursor leaves. */
export const CursorState = defineTaggedUnion({
  Idle: {},
  OnMap: { point: LatLon.LatLon },
  OffMap: { point: LatLon.LatLon },
})
export type CursorState = typeof CursorState.Type

export const Model = Schema.Struct({
  mapState: MapState,
  /** Where the map looks. The map reports each move, and a time-travel replay sets it back. */
  maybeCamera: Schema.Option(Camera.Camera),
  /** The last animated move asked of the map: search and "Find my location" fly to the result. */
  maybeCameraRequest: Schema.Option(CameraRequest.CameraRequest),
  cursor: CursorState,
  maybeCue: Schema.Option(LatLon.LatLon),
  settings: Settings.Model,
  goTo: GoTo.Model,
  copy: Copy.Model,
  layout: Viewport.Layout,
  pointer: Viewport.Pointer,
})
export type Model = typeof Model.Type

export const Flags = Schema.Struct({
  maybeSavedSettings: Schema.Option(Settings.Values),
  maybeCueQuery: Schema.Option(Schema.String),
  maybeCamera: Schema.Option(Camera.Camera),
  layout: Viewport.Layout,
  pointer: Viewport.Pointer,
})
export type Flags = typeof Flags.Type
