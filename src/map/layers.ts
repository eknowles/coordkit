/**
 * The overlay is drawn by MapLibre itself: one line layer (grids, range rings and cue cells,
 * ordered by rank), two circle layers for the cue marker, and a symbol layer for labels.
 * MapLibre layers follow the globe, pitch and bearing exactly, which deck.gl's globe view
 * does not.
 */
import type { GeoJSONSource, Map as MapInstance } from 'maplibre-gl'

import { CUE_COLOR } from './cue'
import { opaqueCssColor } from './features'
import type { OverlayFrame } from './overlay'

const LINES_ID = 'overlay-lines'
const CUE_ID = 'overlay-cue'
const CUE_RING_ID = 'overlay-cue-ring'
const CUE_CENTRE_ID = 'overlay-cue-centre'
const LABELS_ID = 'grid-labels'

const CUE_RING_RADIUS = 7
const CUE_RING_WIDTH = 3
const CUE_CENTRE_RADIUS = 2

// NOTE: these sources are rebuilt for the view after every move, so MapLibre need not tile
// them for far-away zoom levels or with a wide buffer. This keeps the redraw after a move quick.
const REBUILT_EACH_MOVE = { maxzoom: 14, buffer: 32, tolerance: 0.5 } as const

const emptyCollection = (): GeoJSON.FeatureCollection => ({
  type: 'FeatureCollection',
  features: [],
})

const addOverlayLayers = (map: MapInstance): void => {
  if (map.getSource(LINES_ID)) {
    return
  }
  const cueColor = opaqueCssColor(CUE_COLOR)
  map.addSource(LINES_ID, {
    type: 'geojson',
    data: emptyCollection(),
    ...REBUILT_EACH_MOVE,
  })
  map.addSource(CUE_ID, { type: 'geojson', data: emptyCollection() })
  map.addSource(LABELS_ID, {
    type: 'geojson',
    data: emptyCollection(),
    ...REBUILT_EACH_MOVE,
  })
  map.addLayer({
    id: LINES_ID,
    type: 'line',
    source: LINES_ID,
    layout: { 'line-sort-key': ['get', 'rank'], 'line-join': 'round' },
    paint: { 'line-color': ['get', 'color'], 'line-width': ['get', 'width'] },
  })
  map.addLayer({
    id: CUE_RING_ID,
    type: 'circle',
    source: CUE_ID,
    paint: {
      'circle-radius': CUE_RING_RADIUS,
      'circle-color': 'rgba(0, 0, 0, 0)',
      'circle-stroke-color': cueColor,
      'circle-stroke-width': CUE_RING_WIDTH,
    },
  })
  map.addLayer({
    id: CUE_CENTRE_ID,
    type: 'circle',
    source: CUE_ID,
    paint: { 'circle-radius': CUE_CENTRE_RADIUS, 'circle-color': cueColor },
  })
  map.addLayer({
    id: LABELS_ID,
    type: 'symbol',
    source: LABELS_ID,
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

/** Add the overlay layers if the style can take them yet; returns false while the style is still loading. */
export const ensureOverlayLayers = (map: MapInstance): boolean => {
  try {
    addOverlayLayers(map)
    return true
  } catch {
    return false
  }
}

export const setOverlay = (map: MapInstance, frame: OverlayFrame): void => {
  if (ensureOverlayLayers(map)) {
    map.getSource<GeoJSONSource>(LINES_ID)?.setData(frame.lines)
    map.getSource<GeoJSONSource>(CUE_ID)?.setData(frame.cueMarker)
    map.getSource<GeoJSONSource>(LABELS_ID)?.setData(frame.labels)
  }
}
