import { Option } from 'effect'

import { makeParser } from '../parser'
import { pairReading } from '../reading'
import type { Formatter, Parser } from '../types'
import { formatDDMValue, formatDMSValue, parseLatLon } from './angles'

const GRATICULE = Option.some('Graticule')

export const ddFormatter: Formatter = {
  id: 'DD',
  label: 'DD',
  maybeGridId: GRATICULE,
  format: point => pairReading(point.lat.toFixed(6), point.lon.toFixed(6)),
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
  maybeGridId: GRATICULE,
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
