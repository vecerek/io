import * as Context from "@effect/data/Context"
import { pipe } from "@effect/data/Function"
import * as Effect from "@effect/io/Effect"
import * as it from "@effect/io/test/utils/extend"
import { assert, describe } from "vitest"

interface NumberService {
  readonly n: number
}

const NumberService = Context.Tag<NumberService>()

interface StringService {
  readonly s: string
}

const StringService = Context.Tag<StringService>()

describe.concurrent("Effect", () => {
  it.effect("environment - provide is modular", () =>
    pipe(
      Effect.gen(function*($) {
        const v1 = yield* $(NumberService)
        const v2 = yield* $(
          pipe(
            NumberService,
            Effect.provideContext(Context.make(NumberService, { n: 2 }))
          )
        )
        const v3 = yield* $(NumberService)
        assert.strictEqual(v1.n, 4)
        assert.strictEqual(v2.n, 2)
        assert.strictEqual(v3.n, 4)
      }),
      Effect.provideContext(Context.make(NumberService, { n: 4 }))
    ))
  it.effect("environment - provideSomeContext provides context in the right order", () =>
    pipe(
      Effect.gen(function*($) {
        const v1 = yield* $(NumberService)
        const v2 = yield* $(StringService)
        assert.strictEqual(v1.n, 1)
        assert.strictEqual(v2.s, "ok")
      }),
      Effect.provideSomeContext(Context.make(NumberService, { n: 1 })),
      Effect.provideSomeContext(Context.make(NumberService, { n: 2 })),
      Effect.provideSomeContext(Context.make(StringService, { s: "ok" }))
    ))
  it.effect("environment - async can use environment", () =>
    Effect.gen(function*($) {
      const result = yield* $(
        Effect.async<NumberService, never, number>((cb) => cb(Effect.map(NumberService, ({ n }) => n))),
        Effect.provideContext(Context.make(NumberService, { n: 10 }))
      )
      assert.strictEqual(result, 10)
    }))
  it.effect("serviceWith - effectfully accesses a service in the environment", () =>
    Effect.gen(function*($) {
      const result = yield* $(
        Effect.flatMap(NumberService, ({ n }) => Effect.succeed(n + 3)),
        Effect.provideContext(Context.make(NumberService, { n: 0 }))
      )
      assert.strictEqual(result, 3)
    }))
  // TODO: remove
  // it.effect("serviceWith - traced tag", () =>
  //   Effect.gen(function*($) {
  //     const result = yield* $(
  //       Effect.flatMap(NumberService.traced(sourceLocation(new Error())), ({ n }) => Effect.succeed(n + 3)),
  //       Effect.provideContext(Context.make(NumberService, { n: 0 }))
  //     )
  //     assert.strictEqual(result, 3)
  //   }))
  it.effect("updateService - updates a service in the environment", () =>
    pipe(
      Effect.gen(function*($) {
        const a = yield* $(NumberService, Effect.updateService(NumberService, ({ n }) => ({ n: n + 1 })))
        const b = yield* $(NumberService)
        assert.strictEqual(a.n, 1)
        assert.strictEqual(b.n, 0)
      }),
      Effect.provideContext(pipe(Context.make(NumberService, { n: 0 })))
    ))
})
