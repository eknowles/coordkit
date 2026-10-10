import clsx from 'clsx'
import { HashMap, Option } from 'effect'
import { Submodel } from 'foldkit'
import type { Html, HtmlBuilder } from 'foldkit/html'

import { Button } from '@foldkit/ui'

import { Message } from './message'
import { Feedback, type Model } from './model'

export type ViewInputs = Readonly<{
  cellId: string
  text: string
  ariaLabel: string
  lines: readonly [string, string]
  toneClass: string
}>

const feedbackText = (feedback: Feedback): string =>
  Feedback.match(feedback, {
    Copied: () => 'Copied',
    Failed: () => 'Copy failed',
  })

const secondLineView = (
  maybeFeedback: Option.Option<Feedback>,
  detail: string,
  h: HtmlBuilder<Message>,
): Html =>
  Option.match(maybeFeedback, {
    onNone: () => h.span([h.Class('block opacity-80')], [detail]),
    onSome: feedback =>
      h.span(
        [
          h.Class(
            clsx('block', {
              'text-ok': Feedback.guards.Copied(feedback),
              'text-danger': Feedback.guards.Failed(feedback),
            }),
          ),
        ],
        [feedbackText(feedback)],
      ),
  })

/** One readout cell: shows a reading, copies it on click, and announces the result. */
export const view = Submodel.defineView<Model, Message, ViewInputs>(
  (model, viewInputs, h) => {
    const maybeFeedback = HashMap.get(model.feedbackByCellId, viewInputs.cellId)
    const [reading, detail] = viewInputs.lines
    return h.span(
      [h.Class('block')],
      [
        Button.view(
          {
            onClick: Message.ClickedCopy({
              cellId: viewInputs.cellId,
              text: viewInputs.text,
            }),
            toView: attributes =>
              h.button(
                [
                  ...attributes.button,
                  h.AriaLabel(viewInputs.ariaLabel),
                  h.Title(`Copy ${viewInputs.text}`),
                  h.Class(
                    clsx(
                      'block w-full whitespace-nowrap px-3 py-1 text-left leading-5 outline-hidden hover:bg-ink/5 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-focus',
                      viewInputs.toneClass,
                    ),
                  ),
                ],
                [
                  h.span([h.Class('block')], [reading]),
                  secondLineView(maybeFeedback, detail, h),
                ],
              ),
          },
          h,
        ),
        h.span(
          [h.Role('status'), h.AriaLive('polite'), h.Class('sr-only')],
          [
            Option.match(maybeFeedback, {
              onNone: () => '',
              onSome: feedbackText,
            }),
          ],
        ),
      ],
    )
  },
)
