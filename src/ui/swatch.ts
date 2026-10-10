import clsx from 'clsx'
import type { Html, HtmlBuilder } from 'foldkit/html'

import type { Grid } from '../systems/types'

/** The interface is always dark, so swatches use each grid's on-dark colour at full strength. */
const swatchColor = (grid: Grid): string => `rgb(${grid.colors.onDark.slice(0, 3).join(' ')})`

export type SwatchShape = 'Line' | 'Square'

/** A grid's colour key: a short line beside a toggle, or a square beside a readout column name. */
export const gridSwatchView = <Message>(grid: Grid, shape: SwatchShape, isDimmed: boolean, h: HtmlBuilder<Message>): Html =>
  h.span([
    h.Class(
      clsx(
        'inline-block shrink-0',
        shape === 'Line' ? 'h-0.5 w-3.5 rounded' : 'h-2 w-2 rounded-[2px]',
        isDimmed && 'opacity-30',
      ),
    ),
    h.Style({ backgroundColor: swatchColor(grid) }),
    h.AriaHidden(true),
  ])
