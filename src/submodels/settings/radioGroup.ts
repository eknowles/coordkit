import { RadioGroup } from '@foldkit/ui'

import type { MapStyle } from '../../core/domain'
import type { ProfileId } from '../../core/systems/profiles'

export const ProfileRadioGroup = RadioGroup.create<ProfileId>()
export const BasemapRadioGroup = RadioGroup.create<MapStyle.Basemap>()
export const ProjectionRadioGroup = RadioGroup.create<MapStyle.Projection>()
