import { Option, Schema } from 'effect'

import { Popover, RadioGroup } from '@foldkit/ui'

import { GridToggles, MapStyle, RangeRings } from '../domain'
import { GarsPrecision } from '../systems/gars'
import { MgrsPrecision } from '../systems/mgrs'
import { defaultGridToggles } from '../systems/registry'

/** The settings the browser keeps between visits. */
export const Values = Schema.Struct({
  grids: GridToggles.GridToggles,
  isGridLabelsVisible: Schema.Boolean,
  basemap: MapStyle.Basemap,
  projection: MapStyle.Projection,
  mgrsPrecision: MgrsPrecision,
  garsPrecision: GarsPrecision,
  isRangeRingsVisible: Schema.Boolean,
  ringSpacing: RangeRings.RingSpacing,
  ringUnit: RangeRings.RingUnit,
})
export type Values = typeof Values.Type

export const defaultValues: Values = {
  grids: defaultGridToggles(),
  isGridLabelsVisible: true,
  basemap: 'Satellite',
  projection: 'Mercator',
  mgrsPrecision: 0,
  garsPrecision: 30,
  isRangeRingsVisible: true,
  ringSpacing: 'Auto',
  ringUnit: 'NauticalMiles',
}

/** Bump the version when the Values shape changes; old values then fall back to the defaults. */
export const STORAGE_KEY = 'coordkit:settings:v5'
export const ValuesJsonString = Schema.fromJsonString(
  Schema.toCodecJson(Values),
)

export const Model = Schema.Struct({
  values: Values,
  menu: Popover.Model,
  basemapRadioGroup: RadioGroup.Model,
  projectionRadioGroup: RadioGroup.Model,
})
export type Model = typeof Model.Type

export const MENU_ID = 'map-settings'

export const init = (maybeSavedValues: Option.Option<Values>): Model => ({
  values: Option.getOrElse(maybeSavedValues, () => defaultValues),
  menu: Popover.init({ id: MENU_ID }),
  basemapRadioGroup: RadioGroup.init({ id: 'basemap' }),
  projectionRadioGroup: RadioGroup.init({ id: 'projection' }),
})
