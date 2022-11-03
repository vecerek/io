/**
 * @since 1.0.0
 */
import type * as Effect from "@effect/io/Effect"
import * as internal from "@effect/io/internal/schedule"
import type * as ScheduleDecision from "@effect/io/Schedule/Decision"

/**
 * @since 1.0.0
 * @category symbols
 */
export const ScheduleTypeId: unique symbol = internal.ScheduleTypeId

/**
 * @since 1.0.0
 * @category symbols
 */
export type ScheduleTypeId = typeof ScheduleTypeId

/**
 * A `Schedule<Env, In, Out>` defines a recurring schedule, which consumes
 * values of type `In`, and which returns values of type `Out`.
 *
 * Schedules are defined as a possibly infinite set of intervals spread out over
 * time. Each interval defines a window in which recurrence is possible.
 *
 * When schedules are used to repeat or retry effects, the starting boundary of
 * each interval produced by a schedule is used as the moment when the effect
 * will be executed again.
 *
 * Schedules compose in the following primary ways:
 *
 * - Union: performs the union of the intervals of two schedules
 * - Intersection: performs the intersection of the intervals of two schedules
 * - Sequence: concatenates the intervals of one schedule onto another
 *
 * In addition, schedule inputs and outputs can be transformed, filtered (to
 * terminate a schedule early in response to some input or output), and so
 * forth.
 *
 * A variety of other operators exist for transforming and combining schedules,
 * and the companion object for `Schedule` contains all common types of
 * schedules, both for performing retrying, as well as performing repetition.
 *
 * @tsplus type effect/core/io/Schedule
 * @category model
 * @since 1.0.0
 */
export interface Schedule<Env, In, Out> extends Schedule.Variance<Env, In, Out> {
  /** @internal */
  readonly initial: any
  /** @internal */
  readonly step: (
    now: number,
    input: In,
    state: any
  ) => Effect.Effect<Env, never, readonly [any, Out, ScheduleDecision.ScheduleDecision]>
}

/**
 * @since 1.0.0
 */
export declare namespace Schedule {
  /**
   * @since 1.0.0
   * @category models
   */
  export interface Variance<Env, In, Out> {
    readonly [ScheduleTypeId]: {
      readonly _Env: (_: never) => Env
      readonly _In: (_: In) => void
      readonly _Out: (_: never) => Out
    }
  }
}

/**
 * Constructs a new `Schedule` with the specified `initial` state and the
 * specified `step` function.
 *
 * @since 1.0.0
 * @category constructors
 */
export const makeWithState = internal.makeWithState

/**
 * Returns a new schedule that combines this schedule with the specified
 * schedule, continuing as long as both schedules want to continue and merging
 * the next intervals according to the specified merge function.
 *
 * @since 1.0.0
 * @category mutations
 */
export const intersectWith = internal.intersectWith