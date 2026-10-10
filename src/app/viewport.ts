import type { Layout, Pointer } from './domain'

export const COMPACT_QUERY = '(max-width: 767px)'
export const HOVER_QUERY = '(hover: hover)'

export const toLayout = (isCompact: boolean): Layout => (isCompact ? 'Compact' : 'Wide')
export const toPointer = (canHover: boolean): Pointer => (canHover ? 'Hover' : 'Touch')
