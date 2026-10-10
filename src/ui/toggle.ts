import type { Html, HtmlBuilder } from 'foldkit/html'

import { Switch } from '@foldkit/ui'

export type Config<Message> = Readonly<{
  id: string
  label: string
  description: string
  isOn: boolean
  onToggle: Message
  swatch: Html
}>

const CHIP_CLASS = [
  'flex shrink-0 cursor-pointer select-none items-center gap-1.5 whitespace-nowrap rounded-md border px-2 py-1 text-xs outline-hidden',
  'transition-colors duration-100 motion-reduce:transition-none',
  'border-transparent text-faint hover:border-line/40 hover:bg-ink/5 hover:text-ink',
  'data-[checked]:border-line data-[checked]:bg-ink/10 data-[checked]:text-ink data-[checked]:hover:bg-ink/20',
  'active:bg-ink/25 data-[checked]:active:bg-ink/25',
  'focus-visible:ring-2 focus-visible:ring-focus',
  '[@media(hover:none)]:py-1.5',
].join(' ')

/**
 * An on/off chip for the toolbar, built on Switch: screen readers announce "MGRS, switch, on".
 * The whole chip is the switch button, so the swatch, the label and the padding all toggle it.
 */
export const view = <Message>(
  { id, label, description, isOn, onToggle, swatch }: Config<Message>,
  h: HtmlBuilder<Message>,
): Html =>
  Switch.view(
    {
      id,
      isChecked: isOn,
      onToggle: () => onToggle,
      hasDescription: true,
      toView: attributes =>
        h.span(
          [h.Class('flex shrink-0')],
          [
            h.button(
              [...attributes.button, h.Title(description), h.Class(CHIP_CLASS)],
              [
                swatch,
                // NOTE: the label carries only Switch's id, not its click handler. Inside the
                // button, that handler would toggle a second time on each click.
                h.span([h.Id(Switch.labelId(id))], [label]),
              ],
            ),
            h.span(
              [...attributes.description, h.Class('sr-only')],
              [description],
            ),
          ],
        ),
    },
    h,
  )
