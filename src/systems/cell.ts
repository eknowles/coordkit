import type { Box } from '../geo/geometry'

type Cell = Readonly<{
  west: number
  south: number
  east: number
  north: number
}>

/** The box a grid cell covers, for systems whose references name an area. */
export const cellBox = ({ west, south, east, north }: Cell): Box => [
  west,
  south,
  east,
  north,
]
