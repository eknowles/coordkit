import { Option } from 'effect'

import type { ParseResult, Parser } from './types'

/** Build a Parser from a parse function. A parse that throws on malformed text reads as no match. */
export const makeParser = (
  label: string,
  parse: (text: string) => Option.Option<ParseResult>,
): Parser => ({
  label,
  parse: text => Option.flatten(Option.liftThrowable(parse)(text.trim())),
})

/** Text with all whitespace removed and letters upper-cased, the form grid references are compared in. */
export const compact = (text: string): string =>
  text.replace(/\s+/g, '').toUpperCase()
