import type { GridLabel, Position, RGBA } from '../core/geo/geometry'
import type { MapTone } from '../core/systems/types'

/** The order lines draw in, bottom first: grids, then range rings, then the cue's cells. */
export const LineRank = { Grid: 0, Rings: 100, CueCells: 200 } as const

/** A halo in the base map's own background colour keeps labels readable over lines and features. */
export const labelHalo: Record<MapTone, string> = {
  onDark: 'rgba(17, 17, 19, 0.9)',
  onLight: 'rgba(255, 255, 255, 0.92)',
}

const MAX_CHANNEL = 255

export const cssColor = ([red, green, blue, alpha]: RGBA): string =>
  `rgba(${red}, ${green}, ${blue}, ${alpha / MAX_CHANNEL})`

export const opaqueCssColor = ([red, green, blue]: RGBA): string =>
  `rgb(${red}, ${green}, ${blue})`

/**
 * One overlay line. `layer` names what drew it (a grid id, "range-rings" or "cue-cells"), and
 * `rank` orders it within the single MapLibre line layer.
 */
export const lineFeature = (
  path: ReadonlyArray<Position>,
  properties: Readonly<{
    layer: string
    color: RGBA
    width: number
    rank: number
  }>,
): GeoJSON.Feature<GeoJSON.LineString> => ({
  type: 'Feature',
  geometry: { type: 'LineString', coordinates: [...path] },
  properties: {
    layer: properties.layer,
    color: cssColor(properties.color),
    width: properties.width,
    rank: properties.rank,
  },
})

/** A label point. A lower rank wins when labels collide. */
export const labelFeature = (
  label: GridLabel,
  rank: number,
  color: RGBA,
  tone: MapTone,
): GeoJSON.Feature<GeoJSON.Point> => ({
  type: 'Feature',
  geometry: { type: 'Point', coordinates: label.position },
  properties: {
    text: label.text,
    size: label.size,
    rank,
    color: opaqueCssColor(color),
    halo: labelHalo[tone],
  },
})
