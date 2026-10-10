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

/**
 * An on/off chip for the toolbar, built on Switch: screen readers announce "MGRS, switch, on".
 * The label sits beside the button, not inside it, because Switch's label toggles on click too.
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
          [
            h.Class(
              isOn
                ? 'flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-md border border-line bg-ink/10 py-1 pl-1.5 pr-2 text-xs text-ink'
                : 'flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-md border border-transparent py-1 pl-1.5 pr-2 text-xs text-faint hover:text-muted',
            ),
          ],
          [
            h.button(
              [
                ...attributes.button,
                h.Class(
                  'flex h-5 w-5 items-center justify-center rounded focus-visible:ring-2 focus-visible:ring-focus outline-hidden',
                ),
              ],
              [swatch],
            ),
            h.span(
              [...attributes.label, h.Class('cursor-pointer select-none')],
              [label],
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
