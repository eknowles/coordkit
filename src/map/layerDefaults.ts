import type { LayerProps } from '@deck.gl/core'

// NOTE: depth testing against the globe surface makes thin lines break up, so overlays always draw on top.
export const onTop: Pick<LayerProps, 'parameters'> = {
  parameters: { depthCompare: 'always', depthWriteEnabled: false },
}
