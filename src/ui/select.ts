import { Array, Option } from 'effect'
import type { Html, HtmlBuilder } from 'foldkit/html'

export type SelectOption<A> = Readonly<{ value: A; label: string }>

/** A compact select with its label inline; options carry typed values and the DOM sees their string form. */
export const selectView = <A extends string | number, Message>(
  label: string,
  current: A,
  options: Array.NonEmptyReadonlyArray<SelectOption<A>>,
  toMessage: (value: A) => Message,
  h: HtmlBuilder<Message>,
): Html =>
  h.label(
    [h.Class('flex shrink-0 items-center justify-between gap-1.5 whitespace-nowrap text-xs text-faint')],
    [
      label,
      h.select(
        [
          h.AriaLabel(label),
          h.Class(
            'ck-select rounded-md border border-line bg-surface py-1 pl-2 text-xs text-ink [@media(hover:none)]:text-base outline-none hover:border-faint focus:border-focus',
          ),
          h.OnChange(value =>
            toMessage(
              Option.getOrElse(
                Array.findFirst(options, option => String(option.value) === value),
                () => Array.headNonEmpty(options),
              ).value,
            ),
          ),
        ],
        Array.map(options, option =>
          h.option([h.Value(String(option.value)), h.Selected(option.value === current)], [option.label]),
        ),
      ),
    ],
  )
