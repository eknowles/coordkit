import { makeParser } from '../parser'
import { pairReading } from '../reading'
import type { Formatter, Parser } from '../types'
import { formatDDMValue, formatDMSValue, parseLatLon } from './angles'

export const ddFormatter: Formatter = {
  id: 'DD',
  label: 'DD',
  gridId: 'Graticule',
  format: point => pairReading(point.lat.toFixed(6), point.lon.toFixed(6)),
}

export const dmsFormatter: Formatter = {
  id: 'DMS',
  label: 'DMS',
  gridId: 'Graticule',
  format: point => pairReading(formatDMSValue(point.lat, 'lat', 2), formatDMSValue(point.lon, 'lon', 2)),
}

export const ddmFormatter: Formatter = {
  id: 'DDM',
  label: 'DDM',
  gridId: 'Graticule',
  format: point => pairReading(formatDDMValue(point.lat, 'lat', 4), formatDDMValue(point.lon, 'lon', 4)),
}

export const latLonParser: Parser = makeParser('DD, DMS, DDM', parseLatLon)
