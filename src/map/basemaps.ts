import type { StyleSpecification } from 'maplibre-gl'

import type { MapStyle } from '../domain'
import type { MapTone } from '../systems/types'

/** Carto serves the glyphs for every base map, so grid labels can use one font on all of them. */
export const GLYPHS_URL =
  'https://tiles.basemaps.cartocdn.com/fonts/{fontstack}/{range}.pbf'

const satelliteStyle: StyleSpecification = {
  version: 8,
  glyphs: GLYPHS_URL,
  sources: {
    imagery: {
      type: 'raster',
      tiles: [
        'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
      ],
      tileSize: 256,
      maxzoom: 19,
      attribution: 'Imagery © Esri, Maxar, Earthstar Geographics',
    },
  },
  layers: [{ id: 'imagery', type: 'raster', source: 'imagery' }],
}

/** Which grid colours suit each base map. Satellite imagery is dark enough for the dark set. */
export const basemapTone: Record<MapStyle.Basemap, MapTone> = {
  Dark: 'onDark',
  Light: 'onLight',
  Satellite: 'onDark',
}

export const basemapStyles: Record<
  MapStyle.Basemap,
  string | StyleSpecification
> = {
  Dark: 'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json',
  Light: 'https://basemaps.cartocdn.com/gl/positron-gl-style/style.json',
  Satellite: satelliteStyle,
}
