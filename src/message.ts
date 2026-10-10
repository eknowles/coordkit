import { Schema } from 'effect'
import { defineMessageUnion } from 'foldkit/message'

import * as Copy from './copy'
import { Camera, LatLon, Viewport } from './domain'
import * as GoTo from './goTo'
import * as Settings from './settings'

// MESSAGE

export const Message = defineMessageUnion({
  LoadedMap: {},
  FailedLoadMap: { reason: Schema.String },
  MovedMap: { camera: Camera.Camera },
  MovedCursor: { point: LatLon.LatLon },
  LeftMap: {},
  ClickedMap: { point: LatLon.LatLon },
  ClickedClearCue: {},
  UpdatedLayout: { layout: Viewport.Layout },
  UpdatedPointer: { pointer: Viewport.Pointer },
  SucceededReplaceUrl: {},
  FailedReplaceUrl: {},
  GotSettingsMessage: { message: Settings.Message },
  GotGoToMessage: { message: GoTo.Message },
  GotCopyMessage: { message: Copy.Message },
})
export type Message = typeof Message.Type
