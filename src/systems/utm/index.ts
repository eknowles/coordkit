import { makeParser } from '../parser'
import { pairReading } from '../reading'
import type { Formatter, Grid, Parser } from '../types'
import { gzdGrid } from './gzd'
import { LAT_BANDS, fromUps, fromUtm, toUps, toUtm } from './utm'

export const utmFormatter: Formatter = {
  id: 'UTM',
  label: 'UTM / UPS',
  gridId: 'Gzd',
  format: point => {
    if (point.lat >= -80 && point.lat <= 84) {
      const utm = toUtm(point)
      return pairReading(`${utm.zone}${utm.band} ${utm.easting.toFixed(0)}E`, `${utm.northing.toFixed(0)}N`, ' ')
    }
    const ups = toUps(point)
    return pairReading(`UPS ${ups.hemisphere} ${ups.easting.toFixed(0)}E`, `${ups.northing.toFixed(0)}N`, ' ')
  },
}

// "31U 448251 5411932", "31U 448251mE 5411932mN". The letter is the MGRS latitude band.
const UTM_RE = /^(\d{1,2})\s*([C-HJ-NP-X])\s+(\d+(?:\.\d+)?)\s*M?E?\s+(\d+(?:\.\d+)?)\s*M?N?$/

export const utmParser: Parser = makeParser('UTM', text => {
  const match = UTM_RE.exec(text.toUpperCase())
  if (!match) return null
  const band = match[2]!
  if (!LAT_BANDS.includes(band)) return null
  return {
    kind: 'UTM',
    point: fromUtm(Number(match[1]), band >= 'N' ? 'N' : 'S', Number(match[3]), Number(match[4])),
  }
})

// "UPS N 2000000 2000000", or an MGRS polar letter: "Z 2000000 2000000".
const UPS_RE = /^(?:UPS\s*)?([NSABYZ])\s+(\d+(?:\.\d+)?)\s*M?E?\s+(\d+(?:\.\d+)?)\s*M?N?$/

export const upsParser: Parser = makeParser('UPS', text => {
  const match = UPS_RE.exec(text.toUpperCase())
  if (!match) return null
  const hemisphere = 'NYZ'.includes(match[1]!) ? 'N' : 'S'
  return { kind: 'UPS', point: fromUps(hemisphere, Number(match[2]), Number(match[3])) }
})

export const gzdGridDefinition: Grid = {
  id: 'Gzd',
  label: 'UTM zones',
  description: 'UTM zones and MGRS grid zone designations',
  colors: { onDark: [245, 245, 245, 140], onLight: [34, 34, 38, 150] },
  enabledByDefault: true,
  build: gzdGrid,
}
