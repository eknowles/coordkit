import { Schema } from 'effect'

/** Compact turns the readout into a sheet of cards over the map. */
export const Layout = Schema.Literals(['Wide', 'Compact'])
export type Layout = typeof Layout.Type

/** Touch screens cannot hover, so there is no cursor position to report. */
export const Pointer = Schema.Literals(['Hover', 'Touch'])
export type Pointer = typeof Pointer.Type

export const COMPACT_QUERY = '(max-width: 767px)'
export const HOVER_QUERY = '(hover: hover)'

export const toLayout = (isCompact: boolean): Layout =>
  isCompact ? 'Compact' : 'Wide'
export const toPointer = (canHover: boolean): Pointer =>
  canHover ? 'Hover' : 'Touch'
