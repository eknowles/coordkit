import { Schema } from 'effect'
import { defineMessageUnion } from 'foldkit/message'

import { Box, LatLon } from '../domain'

// MESSAGE

export const Message = defineMessageUnion({
  UpdatedQuery: { value: Schema.String },
  SubmittedSearch: {},
  ClickedFindMyLocation: {},
  SucceededGetCurrentPosition: {
    requestId: Schema.Int,
    point: LatLon.LatLon,
  },
  FailedGetCurrentPosition: {
    requestId: Schema.Int,
    reason: Schema.String,
  },
})
export type Message = typeof Message.Type

// OUT MESSAGE

export const OutMessage = defineMessageUnion({
  ChoseLocation: { point: LatLon.LatLon, maybeBox: Schema.Option(Box.Box) },
})
export type OutMessage = typeof OutMessage.Type
