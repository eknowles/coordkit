import { Schema } from 'effect'

/** The zoom level the readout gives the web map tile at. */
export const TileZoom = Schema.Literals([
  1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22,
])
export type TileZoom = typeof TileZoom.Type
