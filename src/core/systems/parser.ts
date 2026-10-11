import { Option } from 'effect'

import type { ParseResult, Parser } from './types'

/**
 * Build a Parser from a parse function. A parse that throws on malformed text reads as no match.
 * A caution, if given, goes with every result.
 */
export const makeParser = (
  label: string,
  parse: (text: string) => Option.Option<Omit<ParseResult, 'maybeCaution'>>,
  maybeCaution: Option.Option<string> = Option.none(),
): Parser => ({
  label,
  parse: text =>
    Option.map(
      Option.flatten(Option.liftThrowable(parse)(text.trim())),
      result => ({ ...result, maybeCaution }),
    ),
})

/** Text with all whitespace removed and letters upper-cased, the form grid references are compared in. */
export const compact = (text: string): string =>
  text.replace(/\s+/g, '').toUpperCase()
