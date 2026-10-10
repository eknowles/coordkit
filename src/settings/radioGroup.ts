import { RadioGroup } from '@foldkit/ui'

import type { MapStyle } from '../domain'

export const BasemapRadioGroup = RadioGroup.create<MapStyle.Basemap>()
export const ProjectionRadioGroup = RadioGroup.create<MapStyle.Projection>()
