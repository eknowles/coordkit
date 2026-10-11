import { Schema } from 'effect'
import { defineTaggedUnion } from 'foldkit/schema'

/**
 * What the last attempt to go somewhere did. Search and "Find my location" share it, because
 * they share one status line and a new attempt of either kind replaces the last one.
 */
export const Status = defineTaggedUnion({
  Idle: {},
  Found: { kind: Schema.String, maybeCaution: Schema.Option(Schema.String) },
  SearchFailed: { reason: Schema.String },
  Locating: { requestId: Schema.Int },
  LocateFailed: { reason: Schema.String },
})
export type Status = typeof Status.Type

/** Each location request gets the next id, so a late answer to an earlier request is not taken for the current one. */
export const Model = Schema.Struct({
  query: Schema.String,
  status: Status,
  locateRequestCount: Schema.Int,
})
export type Model = typeof Model.Type

export const init = (): Model => ({
  query: '',
  status: Status.Idle(),
  locateRequestCount: 0,
})
