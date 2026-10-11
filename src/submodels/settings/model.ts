import { Effect, Option, Schema } from 'effect'

import { RadioGroup } from '@foldkit/ui'

import { GridToggles, MapStyle, RangeRings } from '../../core/domain'
import { GarsPrecision } from '../../core/systems/gars'
import { MgrsPrecision } from '../../core/systems/mgrs'
import { DEFAULT_PROFILE, ProfileId } from '../../core/systems/profiles'
import { defaultGridToggles } from '../../core/systems/registry'
import { TileZoom } from '../../core/systems/tile'

const DEFAULT_TILE_ZOOM = 12

/** The settings the browser keeps between visits. */
export const Values = Schema.Struct({
  /** Settings saved before profiles existed decode as the default profile. */
  profile: ProfileId.pipe(
    Schema.withDecodingDefaultKey(Effect.succeed(DEFAULT_PROFILE)),
  ),
  grids: GridToggles.GridToggles,
  isGridLabelsVisible: Schema.Boolean,
  basemap: MapStyle.Basemap,
  projection: MapStyle.Projection,
  mgrsPrecision: MgrsPrecision,
  garsPrecision: GarsPrecision,
  /** Settings saved before the tile zoom existed decode with the default. */
  tileZoom: TileZoom.pipe(
    Schema.withDecodingDefaultKey(Effect.succeed(DEFAULT_TILE_ZOOM)),
  ),
  isRangeRingsVisible: Schema.Boolean,
  ringSpacing: RangeRings.RingSpacing,
  ringUnit: RangeRings.RingUnit,
  /** Whether the settings strip under the toolbar is open on compact screens. Wide screens always show the panel. */
  isPanelOpen: Schema.Boolean.pipe(
    Schema.withDecodingDefaultKey(Effect.succeed(true)),
  ),
})
export type Values = typeof Values.Type

export const defaultValues: Values = {
  profile: DEFAULT_PROFILE,
  grids: defaultGridToggles(),
  isGridLabelsVisible: true,
  basemap: 'Satellite',
  projection: 'Mercator',
  mgrsPrecision: 0,
  garsPrecision: 30,
  tileZoom: DEFAULT_TILE_ZOOM,
  isRangeRingsVisible: true,
  ringSpacing: 'Auto',
  ringUnit: 'NauticalMiles',
  isPanelOpen: true,
}

/** Bump the version when the Values shape changes; old values then fall back to the defaults. */
export const STORAGE_KEY = 'coordkit:settings:v5'
export const ValuesJsonString = Schema.fromJsonString(
  Schema.toCodecJson(Values),
)

export const Model = Schema.Struct({
  values: Values,
  profileRadioGroup: RadioGroup.Model,
  basemapRadioGroup: RadioGroup.Model,
  projectionRadioGroup: RadioGroup.Model,
})
export type Model = typeof Model.Type

export const init = (maybeSavedValues: Option.Option<Values>): Model => ({
  values: Option.getOrElse(maybeSavedValues, () => defaultValues),
  profileRadioGroup: RadioGroup.init({ id: 'profile' }),
  basemapRadioGroup: RadioGroup.init({ id: 'basemap' }),
  projectionRadioGroup: RadioGroup.init({ id: 'projection' }),
})
