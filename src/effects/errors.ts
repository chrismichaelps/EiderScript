/** @EiderScript.Effects.Errors - Tagged domain errors for Effect pipeline */
import { Data } from 'effect'

export class ParseError extends Data.TaggedError('ParseError')<{
  readonly message: string
  readonly source?: string
}> { }

export class CompileError extends Data.TaggedError('CompileError')<{
  readonly message: string
  readonly source?: string
}> { }

export class RuntimeError extends Data.TaggedError('RuntimeError')<{
  readonly message: string
  readonly cause?: unknown
}> { }

export class FetchError extends Data.TaggedError('FetchError')<{
  readonly url: string
  readonly status: number
  readonly message: string
}> { }
