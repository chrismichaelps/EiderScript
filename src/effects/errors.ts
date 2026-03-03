/** @EiderScript.Effects.Errors - Tagged domain errors for Effect pipeline */
import { Data } from 'effect'
import { Tags } from '../config/constants.js'

export class ParseError extends Data.TaggedError(Tags.PARSE_ERROR)<{
  readonly message: string
  readonly source?: string
}> { }

export class CompileError extends Data.TaggedError(Tags.COMPILE_ERROR)<{
  readonly message: string
  readonly source?: string
}> { }

export class RuntimeError extends Data.TaggedError(Tags.RUNTIME_ERROR)<{
  readonly message: string
  readonly cause?: unknown
}> { }

export class FetchError extends Data.TaggedError(Tags.FETCH_ERROR)<{
  readonly url: string
  readonly status: number
  readonly message: string
}> { }
