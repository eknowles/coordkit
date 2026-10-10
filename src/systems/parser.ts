import { Option } from 'effect'

import type { ParseResult, Parser } from './types'

/** Build a Parser from a function that returns null for text it does not recognise, or throws for text it rejects. */
export const makeParser = (label: string, parse: (text: string) => ParseResult | null): Parser => ({
  label,
  parse: text => Option.flatMap(Option.liftThrowable(parse)(text.trim()), Option.fromNullishOr),
})
