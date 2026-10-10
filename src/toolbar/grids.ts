import clsx from 'clsx'
import { Array } from 'effect'
import type { Html, HtmlBuilder } from 'foldkit/html'

import type { Settings } from '../app/domain'
import { Message } from '../app/message'
import { grids, isGridEnabled } from '../systems/registry'
import { gridSwatchView } from '../ui/swatch'

export const toggleView = (
  label: string,
  description: string,
  isOn: boolean,
  message: Message,
  swatch: Html,
  h: HtmlBuilder<Message>,
): Html =>
  h.button(
    [
      h.Type('button'),
      h.AriaPressed(isOn ? 'true' : 'false'),
      h.Title(description),
      h.OnClick(message),
      h.Class(
        clsx(
          'flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-md border px-2 py-1 text-xs',
          isOn ? 'border-line bg-ink/10 text-ink' : 'border-transparent text-faint hover:text-muted',
        ),
      ),
    ],
    [swatch, label],
  )

export const gridTogglesView = (settings: Settings, h: HtmlBuilder<Message>): Html =>
  h.div(
    [h.Role('group'), h.AriaLabel('Overlays'), h.Class('flex shrink-0 items-center gap-1')],
    [
      ...Array.map(grids, grid => {
        const isOn = isGridEnabled(settings.grids, grid)
        return toggleView(
          grid.label,
          grid.description,
          isOn,
          Message.ToggledGrid({ gridId: grid.id }),
          gridSwatchView(grid, 'Square', !isOn, h),
          h,
        )
      }),
      toggleView('Labels', 'Grid labels on the map', settings.showLabels, Message.ToggledLabels(), h.empty, h),
    ],
  )
