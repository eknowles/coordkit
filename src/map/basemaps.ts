import type { StyleSpecification } from 'maplibre-gl'

import type { MapStyle } from '../core/domain'
import type { MapTone } from '../core/systems/types'

const OPENFREEMAP_URL = 'https://tiles.openfreemap.org'

/** OpenFreeMap serves the glyphs for every base map, so grid labels can use one font on all of them. */
export const GLYPHS_URL = `${OPENFREEMAP_URL}/fonts/{fontstack}/{range}.pbf`

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
  Dark: `${OPENFREEMAP_URL}/styles/dark`,
  Light: `${OPENFREEMAP_URL}/styles/positron`,
  Satellite: satelliteStyle,
}
