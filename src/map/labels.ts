/** Grid labels use a MapLibre symbol layer: deck.gl text does not draw on the MapLibre globe. */
import type { GeoJSONSource, Map as MapInstance } from 'maplibre-gl'

import type { MapTone } from '../systems/types'

const LABEL_SOURCE_ID = 'grid-labels'

/** A halo in the base map's own background colour keeps labels readable over lines and features. */
export const labelHalo: Record<MapTone, string> = {
  onDark: 'rgba(17, 17, 19, 0.9)',
  onLight: 'rgba(255, 255, 255, 0.92)',
}

const addLabelLayer = (map: MapInstance): void => {
  if (map.getSource(LABEL_SOURCE_ID)) {
    return
  }
  map.addSource(LABEL_SOURCE_ID, {
    type: 'geojson',
    data: { type: 'FeatureCollection', features: [] },
  })
  map.addLayer({
    id: LABEL_SOURCE_ID,
    type: 'symbol',
    source: LABEL_SOURCE_ID,
    layout: {
      'text-field': ['get', 'text'],
      'text-font': ['Noto Sans Bold'],
      'text-size': ['get', 'size'],
      'text-allow-overlap': false,
      'text-padding': 1,
      'symbol-sort-key': ['get', 'rank'],
    },
    paint: {
      'text-color': ['get', 'color'],
      'text-halo-color': ['get', 'halo'],
      'text-halo-width': 1.5,
    },
  })
}

/** Add the label layer if the style can take it yet; returns false while the style is still loading. */
export const ensureLabelLayer = (map: MapInstance): boolean => {
  try {
    addLabelLayer(map)
    return true
  } catch {
    return false
  }
}

export const setLabels = (
  map: MapInstance,
  labels: GeoJSON.FeatureCollection,
): void => {
  if (ensureLabelLayer(map)) {
    map.getSource<GeoJSONSource>(LABEL_SOURCE_ID)?.setData(labels)
  }
}
