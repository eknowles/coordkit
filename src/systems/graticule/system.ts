import { Option } from 'effect'

import type { Grid } from '../types'
import { graticule } from './graticule'

export const grid: Grid = {
  id: 'Graticule',
  label: 'Graticule',
  description: 'Latitude and longitude graticule',
  colors: { onDark: [255, 255, 255, 36], onLight: [0, 0, 0, 40] },
  isEnabledByDefault: true,
  build: graticule,
  maybeCueOutline: Option.none(),
}
