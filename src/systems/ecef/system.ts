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
      lines: [`x ${x.toFixed(0)} y ${y.toFixed(0)}`, `z ${z.toFixed(0)}`],
      copyText: `${x.toFixed(2)}, ${y.toFixed(2)}, ${z.toFixed(2)}`,
    }
  },
}
