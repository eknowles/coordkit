import { Schema } from 'effect'

export const Basemap = Schema.Literals(['Dark', 'Light', 'Satellite'])
export type Basemap = typeof Basemap.Type

export const Projection = Schema.Literals(['Globe', 'Mercator'])
export type Projection = typeof Projection.Type
