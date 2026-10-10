import { Option, pipe } from 'effect'

import { makeParser } from '../parser'
import { pairReading } from '../reading'
import type { Formatter, Grid, Parser } from '../types'
import { gzdGrid } from './gzd'
import { LAT_BANDS, fromUps, fromUtm, toUps, toUtm } from './utm'

const UTM_SOUTH_LIMIT = -80
const UTM_NORTH_LIMIT = 84

export const formatter: Formatter = {
  id: 'UTM',
  label: 'UTM / UPS',
  maybeGridId: Option.some('Gzd'),
  format: point => {
    if (point.lat >= UTM_SOUTH_LIMIT && point.lat <= UTM_NORTH_LIMIT) {
      const utm = toUtm(point)
      return pairReading(
        `${utm.zone}${utm.band} ${utm.easting.toFixed(0)}E`,
        `${utm.northing.toFixed(0)}N`,
        ' ',
      )
    }
    const ups = toUps(point)
    return pairReading(
      `UPS ${ups.hemisphere} ${ups.easting.toFixed(0)}E`,
      `${ups.northing.toFixed(0)}N`,
      ' ',
    )
  },
}

// "31U 448251 5411932", "31U 448251mE 5411932mN". The letter is the MGRS latitude band.
const UTM_PATTERN =
  /^(\d{1,2})\s*([C-HJ-NP-X])\s+(\d+(?:\.\d+)?)\s*M?E?\s+(\d+(?:\.\d+)?)\s*M?N?$/

export const utmParser: Parser = makeParser('UTM', text =>
  pipe(
    Option.fromNullishOr(UTM_PATTERN.exec(text.toUpperCase())),
    Option.filter(([, , band]) => LAT_BANDS.includes(band ?? '')),
    Option.map(([, zone, band, easting, northing]) => ({
      kind: 'UTM',
      point: fromUtm(
        Number(zone),
        (band ?? '') >= 'N' ? 'N' : 'S',
        Number(easting),
        Number(northing),
      ),
      maybeBounds: Option.none(),
    })),
  ),
)

// "UPS N 2000000 2000000", or an MGRS polar letter: "Z 2000000 2000000".
const UPS_PATTERN =
  /^(?:UPS\s*)?([NSABYZ])\s+(\d+(?:\.\d+)?)\s*M?E?\s+(\d+(?:\.\d+)?)\s*M?N?$/

export const upsParser: Parser = makeParser('UPS', text =>
  Option.map(
    Option.fromNullishOr(UPS_PATTERN.exec(text.toUpperCase())),
    ([, letter, easting, northing]) => ({
      kind: 'UPS',
      point: fromUps(
        'NYZ'.includes(letter ?? '') ? 'N' : 'S',
        Number(easting),
        Number(northing),
      ),
      maybeBounds: Option.none(),
    }),
  ),
)

export const grid: Grid = {
  id: 'Gzd',
  label: 'UTM zones',
  description: 'UTM zones and MGRS grid zone designations',
  colors: { onDark: [245, 245, 245, 140], onLight: [34, 34, 38, 150] },
  isEnabledByDefault: true,
  build: gzdGrid,
  maybeCueOutline: Option.none(),
}
