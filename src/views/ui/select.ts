import { Array, Option, pipe } from 'effect'
import type { Html, HtmlBuilder } from 'foldkit/html'

import { Select } from '@foldkit/ui'

export type SelectOption<A> = Readonly<{ value: A; label: string }>

export type Config<A, Message> = Readonly<{
  id: string
  label: string
  current: A
  options: Array.NonEmptyReadonlyArray<SelectOption<A>>
  toMessage: (value: A) => Message
}>

const decode = <A extends string | number>(
  options: Array.NonEmptyReadonlyArray<SelectOption<A>>,
  value: string,
): A =>
  pipe(
    options,
    Array.findFirst(option => String(option.value) === value),
    Option.getOrElse(() => Array.headNonEmpty(options)),
  ).value

/** A labelled select with typed option values; the DOM only ever sees their string form. */
export const view = <A extends string | number, Message>(
  { id, label, current, options, toMessage }: Config<A, Message>,
  h: HtmlBuilder<Message>,
): Html =>
  Select.view(
    {
      id,
      value: String(current),
      onChange: value => toMessage(decode(options, value)),
      toView: attributes =>
        h.div(
          [
            h.Class(
              'flex items-center justify-between gap-2 text-xs text-faint',
            ),
          ],
          [
            h.label(
              [...attributes.label, h.Class('whitespace-nowrap')],
              [label],
            ),
            h.select(
              [
                ...attributes.select,
                h.Class(
                  'ck-select rounded-md border border-line bg-surface py-1 pl-2 text-xs text-ink outline-hidden hover:border-faint focus-visible:ring-2 focus-visible:ring-focus [@media(hover:none)]:text-base',
                ),
              ],
              Array.map(options, option =>
                h.option([h.Value(String(option.value))], [option.label]),
              ),
            ),
          ],
        ),
    },
    h,
  )
