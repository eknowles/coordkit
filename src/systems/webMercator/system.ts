import { Option } from 'effect'

import type { Formatter } from '../types'
import { toWebMercator } from './webMercator'

export const formatter: Formatter = {
  id: 'WebMercator',
  label: 'EPSG:3857',
  maybeGridId: Option.none(),
  format: point => {
    const { x, y } = toWebMercator(point)
    return {
      lines: [`x ${x.toFixed(1)}`, `y ${y.toFixed(1)}`],
      copyText: `${x.toFixed(2)}, ${y.toFixed(2)}`,
    }
  },
}
