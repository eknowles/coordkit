import { HashMap, Schema } from 'effect'
import { defineTaggedUnion } from 'foldkit/schema'

/** What a cell shows after a copy. `copyId` ties the feedback to the copy that caused it. */
export const Feedback = defineTaggedUnion({
  Copied: { copyId: Schema.Int },
  Failed: { copyId: Schema.Int },
})
export type Feedback = typeof Feedback.Type

/** Feedback by readout cell, keyed by `${row}-${system}`. */
export const Model = Schema.Struct({
  feedbackByCellId: Schema.HashMap(Schema.String, Feedback),
  copyCount: Schema.Int,
})
export type Model = typeof Model.Type

export const init = (): Model => ({
  feedbackByCellId: HashMap.empty(),
  copyCount: 0,
})
