/**
 * The readout is a table of positions (rows.ts) by coordinate systems (columns.ts).
 * Wide screens put systems across the top; compact screens turn it so systems run down.
 */
import clsx from 'clsx'
import { Array } from 'effect'
import type { Html, HtmlBuilder } from 'foldkit/html'

import type { Message } from '../app/message'
import type { Model } from '../app/model'
import { readingCellView } from './cell'
import { type ReadoutColumn, columns } from './columns'
import { positionLabelView, systemLabelView } from './header'
import { type ReadoutRow, availableRows } from './rows'

const CAPTION = 'The cursor and cue positions in each coordinate system'
const stickyLeft = 'sticky left-0 z-10 bg-panel'
const headingText = 'font-sans text-[11px] font-medium text-muted'

export const readoutBarView = (model: Model, h: HtmlBuilder<Message>): Html =>
  model.layout === 'Wide' ? wideTableView(model, h) : compactTableView(model, h)

const tableView = (head: Html, body: ReadonlyArray<Html>, h: HtmlBuilder<Message>): Html =>
  h.table(
    [h.Class('w-full border-separate border-spacing-0 font-mono text-xs')],
    [h.caption([h.Class('sr-only')], [CAPTION]), h.thead([], [head]), h.tbody([], [...body])],
  )

const cellView = (row: ReadoutRow, column: ReadoutColumn, model: Model, classes: string, h: HtmlBuilder<Message>): Html =>
  h.keyed('td')(`${row.target}-${column.formatter.id}`, [h.Class(clsx('p-0', classes))], [
    readingCellView(row, column, model, h),
  ])

// WIDE: positions down, systems across

const wideTableView = (model: Model, h: HtmlBuilder<Message>): Html => {
  const rows = availableRows(model)
  return h.footer(
    [h.Class('shrink-0 overflow-x-auto border-t border-line bg-panel')],
    [
      tableView(
        h.tr(
          [],
          [
            h.th([h.Scope('col'), h.Class(clsx(stickyLeft, 'w-28'))], [h.span([h.Class('sr-only')], ['Position'])]),
            ...Array.map(columns, column =>
              h.keyed('th')(
                column.formatter.id,
                [h.Scope('col'), h.Class(clsx('min-w-36 border-l border-line px-3 pb-1 pt-2 text-left', headingText))],
                [systemLabelView(column, model, h)],
              ),
            ),
          ],
        ),
        Array.map(rows, (row, index) => {
          const divider = index > 0 && 'border-t border-line-soft'
          return h.keyed('tr')(
            row.target,
            [],
            [
              h.th(
                [h.Scope('row'), h.Class(clsx(stickyLeft, divider, 'px-3 text-left font-sans text-xs font-medium'))],
                [positionLabelView(row, model, h)],
              ),
              ...Array.map(columns, column => cellView(row, column, model, clsx('border-l border-line', divider), h)),
            ],
          )
        }),
        h,
      ),
    ],
  )
}

// COMPACT: systems down, positions across

const compactTableView = (model: Model, h: HtmlBuilder<Message>): Html => {
  const rows = availableRows(model)
  return h.footer(
    [h.Class('max-h-[42dvh] shrink-0 overflow-y-auto border-t border-line bg-panel pb-[env(safe-area-inset-bottom)]')],
    [
      tableView(
        h.tr(
          [h.Class('sticky top-0 z-20 bg-panel')],
          [
            h.th([h.Scope('col'), h.Class(clsx('px-3 py-2 text-left', headingText))], ['System']),
            ...Array.map(rows, row =>
              h.keyed('th')(
                row.target,
                [h.Scope('col'), h.Class('border-l border-line px-3 py-2 text-left font-sans text-xs font-medium')],
                [positionLabelView(row, model, h)],
              ),
            ),
          ],
        ),
        Array.map(columns, column =>
          h.keyed('tr')(
            column.formatter.id,
            [],
            [
              h.th(
                [h.Scope('row'), h.Class(clsx('border-t border-line-soft px-3 text-left align-middle', headingText))],
                [systemLabelView(column, model, h)],
              ),
              ...Array.map(rows, row => cellView(row, column, model, 'border-l border-t border-line border-t-line-soft', h)),
            ],
          ),
        ),
        h,
      ),
    ],
  )
}
