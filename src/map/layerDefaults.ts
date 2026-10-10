// NOTE: depth testing against the globe surface makes thin lines break up, so overlays always draw on top.
export const onTop = { parameters: { depthCompare: 'always', depthWriteEnabled: false } } as const
