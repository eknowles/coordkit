import { Schema } from 'effect'
import { defineMessageUnion } from 'foldkit/message'

// MESSAGE

export const Message = defineMessageUnion({
  ClickedCopy: { cellId: Schema.String, text: Schema.String },
  SucceededCopyText: { cellId: Schema.String, copyId: Schema.Number },
  FailedCopyText: { cellId: Schema.String, copyId: Schema.Number },
  CompletedWaitBeforeHidingCopyFeedback: {
    cellId: Schema.String,
    copyId: Schema.Number,
  },
})
export type Message = typeof Message.Type
