import type { Grid } from '../types'
import { graticule } from './graticule'

export const graticuleGridDefinition: Grid = {
  id: 'Graticule',
  label: 'Graticule',
  description: 'Latitude and longitude graticule',
  colors: { onDark: [255, 255, 255, 36], onLight: [0, 0, 0, 40] },
  enabledByDefault: false,
  build: graticule,
}
