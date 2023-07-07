import type * as Cause from "@effect/io/Cause"
import * as internal from "@effect/io/internal/cause"

// -----------------------------------------------------------------------------
// Pretty Printing
// -----------------------------------------------------------------------------

/** @internal */
const renderToString = (u: unknown): string => {
  if (
    typeof u === "object" &&
    u != null &&
    "toString" in u &&
    typeof u["toString"] === "function" &&
    u["toString"] !== Object.prototype.toString
  ) {
    return u["toString"]()
  }
  if (typeof u === "string") {
    return `Error: ${u}`
  }
  if (typeof u === "object" && u !== null) {
    if ("message" in u && typeof u["message"] === "string") {
      const raw = JSON.parse(JSON.stringify(u))
      const keys = new Set(Object.keys(raw))
      keys.delete("name")
      keys.delete("message")
      keys.delete("_tag")
      if (keys.size === 0) {
        return `${"name" in u && typeof u.name === "string" ? u.name : "Error"}${
          "_tag" in u && typeof u["_tag"] === "string" ? `(${u._tag})` : ``
        }: ${u.message}`
      }
    }
  }
  return `Error: ${JSON.stringify(u)}`
}

/** @internal */
const defaultErrorToLines = (error: unknown): [string, string | undefined] => {
  if (error instanceof Error) {
    return [renderToString(error), error.stack?.split("\n").filter((_) => !_.startsWith("Error")).join("\n")]
  }
  return [renderToString(error), void 0]
}

class RenderError {
  constructor(
    readonly message: string,
    readonly stack: string | undefined
  ) {}
}

/** @internal */
export const pretty = <E>(cause: Cause.Cause<E>): string => {
  if (internal.isInterruptedOnly(cause)) {
    return "All fibers interrupted without errors."
  }
  const final = prettyErrors<E>(cause).map((e) => {
    let message = e.message
    if (e.stack) {
      message += `\r\n${e.stack}`
    }
    return message
  }).join("\r\n\r\n")
  if (!final.includes("\r\n")) {
    return final
  }
  return `\r\n${final}\r\n`
}

/** @internal */
export const prettyErrors = <E>(cause: Cause.Cause<E>) =>
  internal.reduceWithContext(cause, void 0, {
    emptyCase: (): ReadonlyArray<RenderError> => [],
    dieCase: (_, err) => {
      const rendered = defaultErrorToLines(err)
      return [{ message: rendered[0], stack: rendered[1] }]
    },
    failCase: (_, err) => {
      const rendered = defaultErrorToLines(err)
      return [{ message: rendered[0], stack: rendered[1] }]
    },
    interruptCase: () => [],
    parallelCase: (_, l, r) => [...l, ...r],
    sequentialCase: (_, l, r) => [...l, ...r],
    annotatedCase: (_, v, _parent) => v
  })
