import * as Chunk from "@effect/data/Chunk"
import * as Context from "@effect/data/Context"
import * as Duration from "@effect/data/Duration"
import * as Equal from "@effect/data/Equal"
import { constVoid, dual, identity, pipe } from "@effect/data/Function"
import * as HashMap from "@effect/data/HashMap"
import * as number from "@effect/data/Number"
import * as Option from "@effect/data/Option"
import * as Order from "@effect/data/Order"
import type * as SortedSet from "@effect/data/SortedSet"
import type * as Clock from "@effect/io/Clock"
import type { Deferred } from "@effect/io/Deferred"
import type * as Effect from "@effect/io/Effect"
import type * as Fiber from "@effect/io/Fiber"
import type * as FiberId from "@effect/io/Fiber/Id"
import * as FiberStatus from "@effect/io/Fiber/Status"
import * as clock from "@effect/io/internal/clock"
import * as core from "@effect/io/internal/core"
import * as defaultServices from "@effect/io/internal/defaultServices"
import * as effect from "@effect/io/internal/effect"
import * as circular from "@effect/io/internal/effect/circular"
import * as fiberRuntime from "@effect/io/internal/fiberRuntime"
import * as layer from "@effect/io/internal/layer"
import * as ref from "@effect/io/internal/ref"
import * as synchronized from "@effect/io/internal/synchronizedRef"
import * as Annotations from "@effect/io/internal/testing/annotations"
import * as Live from "@effect/io/internal/testing/live"
import * as Data from "@effect/io/internal/testing/testClock/data"
import * as SuspendedWarningData from "@effect/io/internal/testing/testClock/suspendedWarningData"
import * as WarningData from "@effect/io/internal/testing/testClock/warningData"
import type * as Layer from "@effect/io/Layer"
import type * as Ref from "@effect/io/Ref"
import type * as Synchronized from "@effect/io/Ref/Synchronized"

/**
 * A `TestClock` makes it easy to deterministically and efficiently test effects
 * involving the passage of time.
 *
 * Instead of waiting for actual time to pass, `sleep` and methods implemented
 * in terms of it schedule effects to take place at a given clock time. Users
 * can adjust the clock time using the `adjust` and `setTime` methods, and all
 * effects scheduled to take place on or before that time will automatically be
 * run in order.
 *
 * For example, here is how we can test `Effect.timeout` using `TestClock`:
 *
 * ```ts
 * import * as Duration from "@effect/data/Duration"
 * import * as Effect from "@effect/io/Effect"
 * import * as Fiber from "@effect/io/Fiber"
 * import * as TestClock from "@effect/test/TestClock"
 * import * as Option from "@effect/data/Option"
 *
 * Effect.gen(function*() {
 *   const fiber = yield* pipe(
 *     Effect.sleep(Duration.minutes(5)),
 *     Effect.timeout(Duration.minutes(1)),
 *     Effect.fork
 *   )
 *   yield* TestClock.adjust(Duration.minutes(1))
 *   const result = yield* Fiber.join(fiber)
 *   assert.deepStrictEqual(result, Option.none())
 * })
 * ```
 *
 * Note how we forked the fiber that `sleep` was invoked on. Calls to `sleep`
 * and methods derived from it will semantically block until the time is set to
 * on or after the time they are scheduled to run. If we didn't fork the fiber
 * on which we called sleep we would never get to set the time on the line
 * below. Thus, a useful pattern when using `TestClock` is to fork the effect
 * being tested, then adjust the clock time, and finally verify that the
 * expected effects have been performed.
 *
 * @internal
 */
export interface TestClock extends Clock.Clock {
  adjust(duration: Duration.DurationInput): Effect.Effect<never, never, void>
  adjustWith(duration: Duration.DurationInput): <R, E, A>(effect: Effect.Effect<R, E, A>) => Effect.Effect<R, E, A>
  save(): Effect.Effect<never, never, Effect.Effect<never, never, void>>
  setTime(time: number): Effect.Effect<never, never, void>
  sleeps(): Effect.Effect<never, never, Chunk.Chunk<number>>
}

/** @internal */
export const TestClock: Context.Tag<TestClock, TestClock> = Context.Tag<TestClock>(
  Symbol.for("@effect/test/TestClock")
)

/**
 * The warning message that will be displayed if a test is using time but is
 * not advancing the `TestClock`.
 *
 * @internal
 */
const warning = "Warning: A test is using time, but is not advancing " +
  "the test clock, which may result in the test hanging. Use TestClock.adjust to " +
  "manually advance the time."

/**
 * The warning message that will be displayed if a test is advancing the clock
 * but a fiber is still running.
 *
 * @internal
 */
const suspendedWarning = "Warning: A test is advancing the test clock, " +
  "but a fiber is not suspending, which may result in the test hanging. Use " +
  "TestAspect.diagnose to identity the fiber that is not suspending."

/** @internal */
export class TestClockImpl implements TestClock {
  [clock.ClockTypeId]: Clock.ClockTypeId = clock.ClockTypeId
  constructor(
    readonly clockState: Ref.Ref<Data.Data>,
    readonly live: Live.Live,
    readonly annotations: Annotations.Annotations,
    readonly warningState: Synchronized.Synchronized<WarningData.WarningData>,
    readonly suspendedWarningState: Synchronized.Synchronized<SuspendedWarningData.SuspendedWarningData>
  ) {}

  /**
   * Unsafely returns the current time in milliseconds.
   */
  unsafeCurrentTimeMillis(): number {
    return ref.unsafeGet(this.clockState).instant
  }

  /**
   * Returns the current clock time in milliseconds.
   */
  currentTimeMillis: Effect.Effect<never, never, number> = core.map(
    ref.get(this.clockState),
    (data) => data.instant
  )

  /**
   * Unsafely returns the current time in nanoseconds.
   */
  unsafeCurrentTimeNanos(): bigint {
    return BigInt(ref.unsafeGet(this.clockState).instant * 1000000)
  }

  /**
   * Returns the current clock time in nanoseconds.
   */
  currentTimeNanos: Effect.Effect<never, never, bigint> = core.map(
    ref.get(this.clockState),
    (data) => BigInt(data.instant * 1000000)
  )

  /**
   * Saves the `TestClock`'s current state in an effect which, when run, will
   * restore the `TestClock` state to the saved state.
   */
  save(): Effect.Effect<never, never, Effect.Effect<never, never, void>> {
    return core.map(ref.get(this.clockState), (data) => ref.set(this.clockState, data))
  }
  /**
   * Sets the current clock time to the specified instant. Any effects that
   * were scheduled to occur on or before the new time will be run in order.
   */
  setTime(instant: number): Effect.Effect<never, never, void> {
    return core.zipRight(this.warningDone(), this.run(() => instant))
  }
  /**
   * Semantically blocks the current fiber until the clock time is equal to or
   * greater than the specified duration. Once the clock time is adjusted to
   * on or after the duration, the fiber will automatically be resumed.
   */
  sleep(durationInput: Duration.DurationInput): Effect.Effect<never, never, void> {
    const duration = Duration.decode(durationInput)
    return core.flatMap(core.deferredMake<never, void>(), (deferred) =>
      pipe(
        ref.modify(this.clockState, (data) => {
          const end = data.instant + Duration.toMillis(duration)
          if (end > data.instant) {
            return [
              true,
              Data.make(data.instant, pipe(data.sleeps, Chunk.prepend([end, deferred] as const)))
            ] as const
          }
          return [false, data] as const
        }),
        core.flatMap((shouldAwait) =>
          shouldAwait ?
            pipe(this.warningStart(), core.zipRight(core.deferredAwait(deferred))) :
            pipe(core.deferredSucceed(deferred, void 0), core.asUnit)
        )
      ))
  }
  /**
   * Returns a list of the times at which all queued effects are scheduled to
   * resume.
   */
  sleeps(): Effect.Effect<never, never, Chunk.Chunk<number>> {
    return core.map(
      ref.get(this.clockState),
      (data) => Chunk.map(data.sleeps, (_) => _[0])
    )
  }
  /**
   * Increments the current clock time by the specified duration. Any effects
   * that were scheduled to occur on or before the new time will be run in
   * order.
   */
  adjust(durationInput: Duration.DurationInput): Effect.Effect<never, never, void> {
    const duration = Duration.decode(durationInput)
    return core.zipRight(this.warningDone(), this.run((n) => n + Duration.toMillis(duration)))
  }
  /**
   * Increments the current clock time by the specified duration. Any effects
   * that were scheduled to occur on or before the new time will be run in
   * order.
   */
  adjustWith(durationInput: Duration.DurationInput) {
    const duration = Duration.decode(durationInput)
    return <R, E, A>(effect: Effect.Effect<R, E, A>): Effect.Effect<R, E, A> =>
      fiberRuntime.zipLeftOptions(effect, this.adjust(duration), { concurrent: true })
  }
  /**
   * Returns a set of all fibers in this test.
   */
  supervisedFibers(): Effect.Effect<never, never, SortedSet.SortedSet<Fiber.RuntimeFiber<unknown, unknown>>> {
    return this.annotations.supervisedFibers()
  }
  /**
   * Captures a "snapshot" of the identifier and status of all fibers in this
   * test other than the current fiber. Fails with the `Unit` value if any of
   * these fibers are not done or suspended. Note that because we cannot
   * synchronize on the status of multiple fibers at the same time this
   * snapshot may not be fully consistent.
   */
  freeze(): Effect.Effect<never, void, HashMap.HashMap<FiberId.FiberId, FiberStatus.FiberStatus>> {
    return core.flatMap(this.supervisedFibers(), (fibers) =>
      pipe(
        fibers,
        effect.reduce(HashMap.empty<FiberId.FiberId, FiberStatus.FiberStatus>(), (map, fiber) =>
          pipe(
            fiber.status(),
            core.flatMap((status) => {
              if (FiberStatus.isDone(status)) {
                return core.succeed(HashMap.set(map, fiber.id() as FiberId.FiberId, status as FiberStatus.FiberStatus))
              }
              if (FiberStatus.isSuspended(status)) {
                return core.succeed(HashMap.set(map, fiber.id() as FiberId.FiberId, status as FiberStatus.FiberStatus))
              }
              return core.fail(void 0)
            })
          ))
      ))
  }
  /**
   * Forks a fiber that will display a warning message if a test is using time
   * but is not advancing the `TestClock`.
   */
  warningStart(): Effect.Effect<never, never, void> {
    return synchronized.updateSomeEffect(this.warningState, (data) =>
      WarningData.isStart(data) ?
        Option.some(
          pipe(
            this.live.provide(
              pipe(effect.logWarning(warning), effect.delay(Duration.seconds(5)))
            ),
            core.interruptible,
            fiberRuntime.fork,
            core.map((fiber) => WarningData.pending(fiber))
          )
        ) :
        Option.none())
  }
  /**
   * Cancels the warning message that is displayed if a test is using time but
   * is not advancing the `TestClock`.
   */
  warningDone(): Effect.Effect<never, never, void> {
    return synchronized.updateSomeEffect(this.warningState, (warningData) => {
      if (WarningData.isStart(warningData)) {
        return Option.some(core.succeed(WarningData.done))
      }
      if (WarningData.isPending(warningData)) {
        return Option.some(pipe(core.interruptFiber(warningData.fiber), core.as(WarningData.done)))
      }
      return Option.none()
    })
  }
  /**
   * Returns whether all descendants of this fiber are done or suspended.
   */
  suspended(): Effect.Effect<never, void, HashMap.HashMap<FiberId.FiberId, FiberStatus.FiberStatus>> {
    return pipe(
      this.freeze(),
      core.zip(this.live.provide(pipe(effect.sleep(Duration.millis(5)), core.zipRight(this.freeze())))),
      core.flatMap(([first, last]) =>
        Equal.equals(first, last) ?
          core.succeed(first) :
          core.fail(void 0)
      )
    )
  }
  /**
   * Polls until all descendants of this fiber are done or suspended.
   */
  awaitSuspended(): Effect.Effect<never, never, void> {
    return pipe(
      this.suspendedWarningStart(),
      core.zipRight(
        pipe(
          this.suspended(),
          core.zipWith(
            pipe(this.live.provide(effect.sleep(Duration.millis(10))), core.zipRight(this.suspended())),
            Equal.equals
          ),
          effect.filterOrFail(identity, constVoid),
          effect.eventually
        )
      ),
      core.zipRight(this.suspendedWarningDone())
    )
  }
  /**
   * Forks a fiber that will display a warning message if a test is advancing
   * the `TestClock` but a fiber is not suspending.
   */
  suspendedWarningStart(): Effect.Effect<never, never, void> {
    return synchronized.updateSomeEffect(this.suspendedWarningState, (suspendedWarningData) => {
      if (SuspendedWarningData.isStart(suspendedWarningData)) {
        return Option.some(
          pipe(
            this.live.provide(
              pipe(
                effect.logWarning(suspendedWarning),
                core.zipRight(ref.set(this.suspendedWarningState, SuspendedWarningData.done)),
                effect.delay(Duration.seconds(5))
              )
            ),
            core.interruptible,
            fiberRuntime.fork,
            core.map((fiber) => SuspendedWarningData.pending(fiber))
          )
        )
      }
      return Option.none()
    })
  }
  /**
   * Cancels the warning message that is displayed if a test is advancing the
   * `TestClock` but a fiber is not suspending.
   */
  suspendedWarningDone(): Effect.Effect<never, never, void> {
    return synchronized.updateSomeEffect(this.suspendedWarningState, (suspendedWarningData) => {
      if (SuspendedWarningData.isPending(suspendedWarningData)) {
        return Option.some(pipe(core.interruptFiber(suspendedWarningData.fiber), core.as(SuspendedWarningData.start)))
      }
      return Option.none()
    })
  }
  /**
   * Runs all effects scheduled to occur on or before the specified instant,
   * which may depend on the current time, in order.
   */
  run(f: (instant: number) => number): Effect.Effect<never, never, void> {
    return pipe(
      this.awaitSuspended(),
      core.zipRight(pipe(
        ref.modify(this.clockState, (data) => {
          const end = f(data.instant)
          const sorted = pipe(
            data.sleeps,
            Chunk.sort<readonly [number, Deferred<never, void>]>(pipe(number.Order, Order.mapInput((_) => _[0])))
          )
          if (Chunk.isNonEmpty(sorted)) {
            const [instant, deferred] = Chunk.headNonEmpty(sorted)
            if (instant <= end) {
              return [
                Option.some([end, deferred] as const),
                Data.make(instant, Chunk.tailNonEmpty(sorted))
              ] as const
            }
          }
          return [Option.none(), Data.make(end, data.sleeps)] as const
        }),
        core.flatMap((option) => {
          switch (option._tag) {
            case "None": {
              return core.unit
            }
            case "Some": {
              const [end, deferred] = option.value
              return pipe(
                core.deferredSucceed(deferred, void 0),
                core.zipRight(core.yieldNow()),
                core.zipRight(this.run(() => end))
              )
            }
          }
        })
      ))
    )
  }
}

/** @internal */
export const live = (data: Data.Data): Layer.Layer<Annotations.Annotations | Live.Live, never, TestClock> =>
  layer.scoped(
    TestClock,
    effect.gen(function*($) {
      const live = yield* $(Live.Live)
      const annotations = yield* $(Annotations.Annotations)
      const clockState = yield* $(core.sync(() => ref.unsafeMake(data)))
      const warningState = yield* $(circular.makeSynchronized(WarningData.start))
      const suspendedWarningState = yield* $(circular.makeSynchronized(SuspendedWarningData.start))
      const testClock = new TestClockImpl(clockState, live, annotations, warningState, suspendedWarningState)
      yield* $(fiberRuntime.withClockScoped(testClock))
      yield* $(fiberRuntime.addFinalizer(
        () => core.zipRight(testClock.warningDone(), testClock.suspendedWarningDone())
      ))
      return testClock
    })
  )

/** @internal */
export const defaultTestClock: Layer.Layer<Annotations.Annotations | Live.Live, never, TestClock> = live(
  Data.make(new Date(0).getTime(), Chunk.empty())
)

/**
 * Accesses a `TestClock` instance in the context and increments the time
 * by the specified duration, running any actions scheduled for on or before
 * the new time in order.
 *
 * @internal
 */
export const adjust = (durationInput: Duration.DurationInput): Effect.Effect<never, never, void> => {
  const duration = Duration.decode(durationInput)
  return testClockWith((testClock) => testClock.adjust(duration))
}

/** @internal */
export const adjustWith = dual<
  (duration: Duration.DurationInput) => <R, E, A>(effect: Effect.Effect<R, E, A>) => Effect.Effect<R, E, A>,
  <R, E, A>(effect: Effect.Effect<R, E, A>, duration: Duration.DurationInput) => Effect.Effect<R, E, A>
>(2, (effect, durationInput) => {
  const duration = Duration.decode(durationInput)
  return testClockWith((testClock) => testClock.adjustWith(duration)(effect))
})

/**
 * Accesses a `TestClock` instance in the context and saves the clock
 * state in an effect which, when run, will restore the `TestClock` to the
 * saved state.
 *
 * @internal
 */
export const save = (): Effect.Effect<never, never, Effect.Effect<never, never, void>> =>
  testClockWith((testClock) => testClock.save())

/**
 * Accesses a `TestClock` instance in the context and sets the clock time
 * to the specified `Instant`, running any actions scheduled for on or before
 * the new time in order.
 *
 * @internal
 */
export const setTime = (instant: number): Effect.Effect<never, never, void> =>
  testClockWith((testClock) => testClock.setTime(instant))

/**
 * Semantically blocks the current fiber until the clock time is equal to or
 * greater than the specified duration. Once the clock time is adjusted to
 * on or after the duration, the fiber will automatically be resumed.
 *
 * @internal
 */
export const sleep = (durationInput: Duration.DurationInput): Effect.Effect<never, never, void> => {
  const duration = Duration.decode(durationInput)
  return testClockWith((testClock) => testClock.sleep(duration))
}

/**
 * Accesses a `TestClock` instance in the context and returns a list of
 * times that effects are scheduled to run.
 *
 * @internal
 */
export const sleeps = (): Effect.Effect<never, never, Chunk.Chunk<number>> =>
  testClockWith(
    (testClock) => testClock.sleeps()
  )

/**
 * Retrieves the `TestClock` service for this test.
 *
 * @internal
 */
export const testClock = (): Effect.Effect<never, never, TestClock> => testClockWith(core.succeed)

/**
 * Retrieves the `TestClock` service for this test and uses it to run the
 * specified workflow.
 *
 * @internal
 */
export const testClockWith = <R, E, A>(f: (testClock: TestClock) => Effect.Effect<R, E, A>): Effect.Effect<R, E, A> =>
  core.fiberRefGetWith(
    defaultServices.currentServices,
    (services) => f(pipe(services, Context.get(clock.clockTag)) as TestClock)
  )

/**
 * Accesses the current time of a `TestClock` instance in the context in
 * milliseconds.
 *
 * @internal
 */
export const currentTimeMillis: Effect.Effect<never, never, number> = testClockWith((testClock) =>
  testClock.currentTimeMillis
)
