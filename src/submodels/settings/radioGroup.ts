import { RadioGroup } from '@foldkit/ui'

import type { MapStyle } from '../../core/domain'

export const BasemapRadioGroup = RadioGroup.create<MapStyle.Basemap>()
export const ProjectionRadioGroup = RadioGroup.create<MapStyle.Projection>()
