import { Schema } from 'effect'
import { defineTaggedUnion } from 'foldkit/schema'

import { Box, LatLon } from '../core/domain'

/** Where an animated camera move goes: to a point, or to fit an area. */
export const CameraTarget = defineTaggedUnion({
  FlyTo: { point: LatLon.LatLon },
  FitBox: { box: Box.Box },
})
export type CameraTarget = typeof CameraTarget.Type

/** An animated move the map performs once. A new id asks for a new move. */
export const CameraRequest = Schema.Struct({
  id: Schema.Int,
  target: CameraTarget,
})
export type CameraRequest = typeof CameraRequest.Type
