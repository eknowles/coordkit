import { Array, pipe } from 'effect'
import type { Html, HtmlBuilder } from 'foldkit/html'

import type { Grid } from '../systems/types'

/** The interface is always dark, so swatches use each grid's on-dark colour at full strength. */
const swatchColor = (grid: Grid): string =>
  `rgb(${pipe(grid.colors.onDark, Array.take(3), Array.map(String), Array.join(' '))})`

/** A grid's colour key, beside its toggle and its readout column name; faded when the grid is off. */
export const view = <Message>(
  grid: Grid,
  isDimmed: boolean,
  h: HtmlBuilder<Message>,
): Html =>
  h.span([
    h.Class('inline-block h-2 w-2 shrink-0 rounded-[2px]'),
    h.Style({
      backgroundColor: swatchColor(grid),
      opacity: isDimmed ? '0.3' : '1',
    }),
    h.AriaHidden(true),
  ])
