import { Schema } from 'effect'
import { defineMessageUnion } from 'foldkit/message'

import { Popover, RadioGroup } from '@foldkit/ui'

import { RangeRings } from '../domain'
import { GarsPrecision } from '../systems/gars'
import { MgrsPrecision } from '../systems/mgrs'
import { TileZoom } from '../systems/tile'

// MESSAGE

export const Message = defineMessageUnion({
  ToggledGrid: { gridId: Schema.String },
  ToggledGridLabels: {},
  ToggledRangeRings: {},
  SelectedMgrsPrecision: { precision: MgrsPrecision },
  SelectedGarsPrecision: { precision: GarsPrecision },
  SelectedTileZoom: { zoom: TileZoom },
  SelectedRingSpacing: { spacing: RangeRings.RingSpacing },
  SelectedRingUnit: { unit: RangeRings.RingUnit },
  GotMenuMessage: { message: Popover.Message },
  GotBasemapRadioGroupMessage: { message: RadioGroup.Message },
  GotProjectionRadioGroupMessage: { message: RadioGroup.Message },
  SucceededSaveSettings: {},
  FailedSaveSettings: {},
})
export type Message = typeof Message.Type
