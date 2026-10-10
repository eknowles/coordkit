import { Data, Duration, Effect, HashMap, Option, Schema } from 'effect'
import { Command, type Update } from 'foldkit'
import { modifyFields } from 'foldkit/struct'

import { Message } from './message'
import { Feedback, type Model } from './model'

type UpdateReturn = Update.Return<Model, Message>

const showFeedback = (
  model: Model,
  cellId: string,
  feedback: Feedback,
): UpdateReturn => ({
  model: modifyFields(model, {
    feedbackByCellId: HashMap.set(cellId, feedback),
  }),
  commands: [WaitBeforeHidingCopyFeedback({ cellId, copyId: feedback.copyId })],
})

// UPDATE

export const update = (model: Model, message: Message) =>
  Message.match<UpdateReturn>(message, {
    ClickedCopy: ({ cellId, text }) => {
      const copyId = model.copyCount + 1
      return {
        model: modifyFields(model, { copyCount: () => copyId }),
        commands: [CopyText({ cellId, text, copyId })],
      }
    },

    SucceededCopyText: ({ cellId, copyId }) =>
      showFeedback(model, cellId, Feedback.Copied({ copyId })),

    FailedCopyText: ({ cellId, copyId }) =>
      showFeedback(model, cellId, Feedback.Failed({ copyId })),

    // NOTE: a newer copy of the same cell owns the feedback now, so an older wait leaves it alone.
    CompletedWaitBeforeHidingCopyFeedback: ({ cellId, copyId }) => ({
      model: modifyFields(model, {
        feedbackByCellId: feedbackByCellId =>
          Option.exists(
            HashMap.get(feedbackByCellId, cellId),
            feedback => feedback.copyId === copyId,
          )
            ? HashMap.remove(feedbackByCellId, cellId)
            : feedbackByCellId,
      }),
    }),
  })

// COMMAND

class ClipboardRefusedError extends Data.TaggedError('ClipboardRefusedError')<{
  readonly cause: unknown
}> {}

export const CopyText = Command.define('CopyText', {
  args: { cellId: Schema.String, text: Schema.String, copyId: Schema.Int },
  messages: [Message.SucceededCopyText, Message.FailedCopyText],
  execute: ({ cellId, text, copyId }) =>
    Effect.tryPromise({
      try: () => navigator.clipboard.writeText(text),
      catch: cause => new ClipboardRefusedError({ cause }),
    }).pipe(
      Effect.as(Message.SucceededCopyText({ cellId, copyId })),
      Effect.catch(() =>
        Effect.succeed(Message.FailedCopyText({ cellId, copyId })),
      ),
    ),
})

const COPY_FEEDBACK_DURATION = Duration.millis(1200)

export const WaitBeforeHidingCopyFeedback = Command.define(
  'WaitBeforeHidingCopyFeedback',
  {
    args: { cellId: Schema.String, copyId: Schema.Int },
    messages: [Message.CompletedWaitBeforeHidingCopyFeedback],
    execute: ({ cellId, copyId }) =>
      Effect.sleep(COPY_FEEDBACK_DURATION).pipe(
        Effect.as(
          Message.CompletedWaitBeforeHidingCopyFeedback({ cellId, copyId }),
        ),
      ),
  },
)
