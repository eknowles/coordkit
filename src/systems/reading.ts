import type { Reading } from './types'

export const pairReading = (first: string, second: string, separator = ', '): Reading => ({
  lines: [first, second],
  copyText: `${first}${separator}${second}`,
})

export const singleReading = (value: string, note: string): Reading => ({
  lines: [value, note],
  copyText: value,
})
