import { Option } from 'effect'

import type { Formatter } from '../types'
import { toEcef } from './ecef'

export const formatter: Formatter = {
  id: 'ECEF',
  label: 'ECEF',
  maybeGridId: Option.none(),
  format: point => {
    const { x, y, z } = toEcef(point)
    return {
      // NOTE: the app has no heights, so the point is on the ellipsoid (h 0 m); the second line says so.
      lines: [
        `x ${x.toFixed(0)} y ${y.toFixed(0)}`,
        `z ${z.toFixed(0)} · h 0 m`,
      ],
      copyText: `${x.toFixed(2)}, ${y.toFixed(2)}, ${z.toFixed(2)}`,
    }
  },
}
