import clsx from 'clsx'
import { Array, Option } from 'effect'
import type { Html, HtmlBuilder } from 'foldkit/html'

import type { Message } from '@/message'
import type { Model } from '@/model'

import { DATUM_LABEL } from '../../core/geo/ellipsoid'
import * as Cell from './cell'
import { type ReadoutColumn, columnsFor } from './columns'
import { positionLabelView, systemLabelView } from './header'
import { type ReadoutRow, availableRows } from './rows'

const CAPTION = 'The cursor and cue positions in each coordinate system'
const stickyLeft = 'sticky left-0 z-10 bg-panel'
const headingText = 'font-sans text-[11px] font-medium text-muted'

/** Every reading is on one datum, so the readout names it once. */
const datumView = (h: HtmlBuilder<Message>): Html =>
  h.span(
    [
      h.Class(headingText),
      h.Title(`All positions are on the ${DATUM_LABEL} datum`),
    ],
    [DATUM_LABEL],
  )

const readoutTableView = (
  head: Html,
  body: ReadonlyArray<Html>,
  h: HtmlBuilder<Message>,
): Html =>
  h.table(
    [h.Class('w-full border-separate border-spacing-0 font-mono text-xs')],
    [
      h.caption([h.Class('sr-only')], [CAPTION]),
      h.thead([], [head]),
      h.tbody([], [...body]),
    ],
  )

const cellView = (
  row: ReadoutRow,
  column: ReadoutColumn,
  model: Model,
  classes: string,
  h: HtmlBuilder<Message>,
): Html =>
  h.keyed('td')(
    `${row.id}-${column.formatter.id}`,
    [h.Class(clsx('p-0', classes))],
    [Cell.view(row, column, model, h)],
  )

// WIDE: positions down, systems across

/**
 * The readout shows positions (rows.ts) in each coordinate system (columns.ts). Wide screens
 * get this table under the map.
 */
export const tableView = (model: Model, h: HtmlBuilder<Message>): Html => {
  const rows = availableRows(model)
  const columns = columnsFor(model.settings.values.profile)
  return h.section(
    [
      h.AriaLabel('Coordinate readout'),
      h.Class('shrink-0 overflow-x-auto border-t border-line bg-panel'),
    ],
    [
      readoutTableView(
        h.tr(
          [],
          [
            h.th(
              [
                h.Scope('col'),
                h.Class(clsx(stickyLeft, 'w-28 px-3 pb-1 pt-2 text-left')),
              ],
              [h.span([h.Class('sr-only')], ['Position. ']), datumView(h)],
            ),
            ...Array.map(columns, column =>
              h.keyed('th')(
                column.formatter.id,
                [
                  h.Scope('col'),
                  h.Class(
                    clsx(
                      'min-w-36 border-l border-line px-3 pb-1 pt-2 text-left',
                      headingText,
                    ),
                  ),
                ],
                [systemLabelView(column, model, h)],
              ),
            ),
          ],
        ),
        Array.map(rows, (row, index) => {
          const divider = index > 0 && 'border-t border-line-soft'
          return h.keyed('tr')(
            row.id,
            [],
            [
              h.th(
                [
                  h.Scope('row'),
                  h.Class(
                    clsx(
                      stickyLeft,
                      divider,
                      'px-3 text-left font-sans text-xs font-medium',
                    ),
                  ),
                ],
                [positionLabelView(row, model, h)],
              ),
              ...Array.map(columns, column =>
                cellView(
                  row,
                  column,
                  model,
                  clsx('border-l border-line', divider),
                  h,
                ),
              ),
            ],
          )
        }),
        h,
      ),
    ],
  )
}

// COMPACT: a sheet of system cards that scrolls sideways

const cardView = (
  column: ReadoutColumn,
  rows: ReadonlyArray<ReadoutRow>,
  model: Model,
  h: HtmlBuilder<Message>,
): Html =>
  h.keyed('li')(
    column.formatter.id,
    [
      h.Class(
        'w-44 shrink-0 snap-start overflow-hidden rounded-lg border border-line bg-surface',
      ),
    ],
    [
      h.div(
        [h.Class(clsx('px-3 pb-0.5 pt-2', headingText))],
        [systemLabelView(column, model, h)],
      ),
      ...Array.map(rows, row =>
        h.keyed('div')(
          row.id,
          [h.Class('pb-1 font-mono text-xs')],
          [Cell.view(row, column, model, h)],
        ),
      ),
    ],
  )

/** Compact screens get a sheet over the map, one card per system, which slides up while there is a position to show. */
export const sheetView = (model: Model, h: HtmlBuilder<Message>): Html => {
  const rows = availableRows(model)
  const columns = columnsFor(model.settings.values.profile)
  const isOpen = Array.some(rows, row => Option.isSome(row.point(model)))
  return h.section(
    [
      h.AriaLabel('Coordinate readout'),
      h.AriaHidden(!isOpen),
      ...(isOpen ? [] : [h.Attribute('inert', '')]),
      h.Class(
        clsx(
          'absolute inset-x-0 bottom-0 z-10 border-t border-line bg-panel/95 pb-[env(safe-area-inset-bottom)]',
          'shadow-[0_-8px_24px_rgba(0,0,0,0.35)] transition-transform duration-200 ease-out motion-reduce:transition-none',
          isOpen ? 'translate-y-0' : 'pointer-events-none translate-y-full',
        ),
      ),
    ],
    [
      h.div(
        [h.Class('flex items-center gap-4 px-3 pb-1 pt-2 text-xs font-medium')],
        [
          ...Array.map(rows, row =>
            h.keyed('div')(
              row.id,
              [h.Class('flex flex-1 items-center')],
              [positionLabelView(row, model, h)],
            ),
          ),
          datumView(h),
        ],
      ),
      h.ul(
        [
          h.AriaLabel('Coordinate systems'),
          h.Class(
            'flex snap-x snap-mandatory scroll-px-3 gap-2 overflow-x-auto px-3 pb-3 pt-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden',
          ),
        ],
        Array.map(columns, column => cardView(column, rows, model, h)),
      ),
    ],
  )
}
