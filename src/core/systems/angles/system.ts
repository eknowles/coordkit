import { Option } from 'effect'

import { makeParser } from '../parser'
import { pairReading } from '../reading'
import type { Formatter, Grid, Parser } from '../types'
import {
  formatDDMValue,
  formatDMSValue,
  parseLatLon,
  toFixedUnsignedZero,
} from './angles'
import { buildDdmGrid, ddmCellOutline } from './ddmGrid'

const GRATICULE = Option.some('Graticule')
const DDM_GRID_ID = 'Ddm'

export const ddFormatter: Formatter = {
  id: 'DD',
  label: 'DD',
  maybeGridId: GRATICULE,
  format: point =>
    pairReading(
      toFixedUnsignedZero(point.lat, 6),
      toFixedUnsignedZero(point.lon, 6),
    ),
}

export const dmsFormatter: Formatter = {
  id: 'DMS',
  label: 'DMS',
  maybeGridId: GRATICULE,
  format: point =>
    pairReading(
      formatDMSValue(point.lat, 'lat', 2),
      formatDMSValue(point.lon, 'lon', 2),
    ),
}

export const ddmFormatter: Formatter = {
  id: 'DDM',
  label: 'DDM',
  maybeGridId: Option.some(DDM_GRID_ID),
  format: point =>
    pairReading(
      formatDDMValue(point.lat, 'lat', 4),
      formatDDMValue(point.lon, 'lon', 4),
    ),
}

export const parser: Parser = makeParser('DD, DMS, DDM', text =>
  Option.map(Option.fromNullishOr(parseLatLon(text)), ({ kind, point }) => ({
    kind,
    point,
    maybeBounds: Option.none(),
  })),
)

/** Chart-style degrees and minutes. Off by default: with the decimal graticule on as well, the map is busy. */
export const ddmGrid: Grid = {
  id: DDM_GRID_ID,
  label: 'DDM',
  description: 'Degrees and minutes, as on a nautical chart',
  colors: { onDark: [240, 90, 200, 140], onLight: [180, 20, 140, 160] },
  isEnabledByDefault: false,
  build: buildDdmGrid,
  maybeCueOutline: Option.some(point => Option.some(ddmCellOutline(point))),
}
