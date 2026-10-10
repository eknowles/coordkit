import clsx from 'clsx'
import { Array } from 'effect'
import type { Html, HtmlBuilder } from 'foldkit/html'

import type { SelectOption } from './select'

/** A labelled row of buttons where one is pressed: for short lists that are quicker to click than to open. */
export const segmentedView = <A extends string | number, Message>(
  label: string,
  current: A,
  options: Array.NonEmptyReadonlyArray<SelectOption<A>>,
  toMessage: (value: A) => Message,
  h: HtmlBuilder<Message>,
): Html =>
  h.div(
    [h.Role('group'), h.AriaLabel(label), h.Class('flex items-center justify-between gap-2 text-xs text-faint')],
    [
      h.span([h.AriaHidden(true)], [label]),
      h.div(
        [h.Class('flex rounded-md border border-line bg-surface p-0.5')],
        Array.map(options, option => {
          const isPressed = option.value === current
          return h.button(
            [
              h.Type('button'),
              h.AriaPressed(isPressed ? 'true' : 'false'),
              h.OnClick(toMessage(option.value)),
              h.Class(
                clsx(
                  'rounded px-2 py-0.5 text-xs [@media(hover:none)]:py-1.5',
                  isPressed ? 'bg-ink/15 text-ink' : 'text-muted hover:text-ink',
                ),
              ),
            ],
            [option.label],
          )
        }),
      ),
    ],
  )
