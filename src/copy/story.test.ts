import { HashMap, Option } from 'effect'
import { Command, given, message, model, story } from 'foldkit/story'
import { describe, expect, test } from 'vitest'

import { Message } from './message'
import { Feedback, init } from './model'
import { CopyText, WaitBeforeHidingCopyFeedback, update } from './update'

const cellId = 'Cue-MGRS'
const text = '30U XC 99 35'

describe('copy', () => {
  test('a successful copy shows "Copied" until the wait ends', () => {
    story(
      update,
      given(init()),
      message(Message.ClickedCopy({ cellId, text })),
      Command.expectExact(CopyText({ cellId, text, copyId: 1 })),
      Command.resolve(
        CopyText,
        Message.SucceededCopyText({ cellId, copyId: 1 }),
      ),
      model(({ feedbackByCellId }) =>
        expect(HashMap.get(feedbackByCellId, cellId)).toEqual(
          Option.some(Feedback.Copied({ copyId: 1 })),
        ),
      ),
      Command.resolve(
        WaitBeforeHidingCopyFeedback,
        Message.CompletedWaitBeforeHidingCopyFeedback({ cellId, copyId: 1 }),
      ),
      model(({ feedbackByCellId }) =>
        expect(HashMap.isEmpty(feedbackByCellId)).toBe(true),
      ),
    )
  })

  test('a refused copy shows "Copy failed" until the wait ends', () => {
    story(
      update,
      given(init()),
      message(Message.ClickedCopy({ cellId, text })),
      Command.resolve(CopyText, Message.FailedCopyText({ cellId, copyId: 1 })),
      model(({ feedbackByCellId }) =>
        expect(HashMap.get(feedbackByCellId, cellId)).toEqual(
          Option.some(Feedback.Failed({ copyId: 1 })),
        ),
      ),
      Command.resolve(
        WaitBeforeHidingCopyFeedback,
        Message.CompletedWaitBeforeHidingCopyFeedback({ cellId, copyId: 1 }),
      ),
      model(({ feedbackByCellId }) =>
        expect(HashMap.isEmpty(feedbackByCellId)).toBe(true),
      ),
    )
  })

  test('the wait for an earlier copy does not hide the feedback of a later one', () => {
    const laterCopy = Feedback.Copied({ copyId: 2 })
    story(
      update,
      given({
        feedbackByCellId: HashMap.make([cellId, laterCopy]),
        copyCount: 2,
      }),
      message(
        Message.CompletedWaitBeforeHidingCopyFeedback({ cellId, copyId: 1 }),
      ),
      model(({ feedbackByCellId }) =>
        expect(HashMap.get(feedbackByCellId, cellId)).toEqual(
          Option.some(laterCopy),
        ),
      ),
      message(
        Message.CompletedWaitBeforeHidingCopyFeedback({ cellId, copyId: 2 }),
      ),
      model(({ feedbackByCellId }) =>
        expect(HashMap.isEmpty(feedbackByCellId)).toBe(true),
      ),
    )
  })
})
