import { Option, pipe } from 'effect'

import { cellBox } from '../cell'
import { makeParser } from '../parser'
import type { Formatter, Grid, Parser } from '../types'
import { tileGrid, tileOutline } from './grid'
import {
  type Tile,
  fromQuadkey,
  fromTilePath,
  tileCell,
  tilePath,
  toQuadkey,
  toTile,
} from './tile'

export const formatter: Formatter = {
  id: 'Tile',
  label: 'Map tile',
  maybeGridId: Option.some('Tile'),
  format: (point, { tileZoom }) => {
    const tile = toTile(point, tileZoom)
    return {
      lines: [tilePath(tile), `quadkey ${toQuadkey(tile)}`],
      copyText: tilePath(tile),
    }
  },
}

const QUADKEY_PREFIX_RE = /^(?:qk|quadkey):/i

const toParseResult = (tile: Tile) => {
  const cell = tileCell(tile)
  return {
    kind: 'Map tile',
    point: {
      lat: (cell.south + cell.north) / 2,
      lon: (cell.west + cell.east) / 2,
    },
    maybeBounds: Option.some(cellBox(cell)),
  }
}

/** Reads `z/x/y`, or a quadkey written as `qk:` followed by the digits. */
export const parser: Parser = makeParser('Map tile', text =>
  pipe(
    text.replace(/\s+/g, ''),
    Option.liftPredicate(
      compacted => compacted.includes('/') || QUADKEY_PREFIX_RE.test(compacted),
    ),
    Option.map(compacted =>
      QUADKEY_PREFIX_RE.test(compacted)
        ? fromQuadkey(compacted.replace(QUADKEY_PREFIX_RE, ''))
        : fromTilePath(compacted),
    ),
    Option.map(toParseResult),
  ),
)

export const grid: Grid = {
  id: 'Tile',
  label: 'Tiles',
  description: 'Web map tile boundaries, labelled z/x/y',
  colors: { onDark: [240, 200, 80, 140], onLight: [170, 120, 0, 170] },
  isEnabledByDefault: false,
  build: tileGrid,
  maybeCueOutline: Option.some((point, { tileZoom }) =>
    Option.some(tileOutline(toTile(point, tileZoom))),
  ),
}
