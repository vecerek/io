---
title: FiberRef.ts
nav_order: 16
parent: Modules
---

## FiberRef overview

Added in v1.0.0

---

<h2 class="text-delta">Table of contents</h2>

- [constructors](#constructors)
  - [make](#make)
  - [makeEnvironment](#makeenvironment)
  - [makeRuntimeFlags](#makeruntimeflags)
  - [makeWith](#makewith)
  - [unsafeMake](#unsafemake)
  - [unsafeMakeEnvironment](#unsafemakeenvironment)
  - [unsafeMakeHashSet](#unsafemakehashset)
  - [unsafeMakePatch](#unsafemakepatch)
  - [unsafeMakeSupervisor](#unsafemakesupervisor)
- [fiberRefs](#fiberrefs)
  - [currentEnvironment](#currentenvironment)
  - [currentLogAnnotations](#currentlogannotations)
  - [currentLogLevel](#currentloglevel)
  - [currentLogSpan](#currentlogspan)
  - [currentLoggers](#currentloggers)
  - [currentParallelism](#currentparallelism)
  - [currentRuntimeFlags](#currentruntimeflags)
  - [currentScheduler](#currentscheduler)
  - [currentSupervisor](#currentsupervisor)
  - [forkScopeOverride](#forkscopeoverride)
  - [interruptedCause](#interruptedcause)
- [getters](#getters)
  - [get](#get)
- [model](#model)
  - [FiberRef (interface)](#fiberref-interface)
- [models](#models)
  - [Variance (interface)](#variance-interface)
- [mutations](#mutations)
  - [delete](#delete)
  - [getAndSet](#getandset)
  - [getAndUpdate](#getandupdate)
  - [getAndUpdateSome](#getandupdatesome)
  - [getWith](#getwith)
  - [locally](#locally)
  - [locallyScoped](#locallyscoped)
  - [locallyScopedWith](#locallyscopedwith)
  - [locallyWith](#locallywith)
  - [modify](#modify)
  - [modifySome](#modifysome)
  - [reset](#reset)
  - [set](#set)
  - [update](#update)
  - [updateAndGet](#updateandget)
  - [updateSome](#updatesome)
  - [updateSomeAndGet](#updatesomeandget)
- [symbols](#symbols)
  - [FiberRefTypeId](#fiberreftypeid)
  - [FiberRefTypeId (type alias)](#fiberreftypeid-type-alias)

---

# constructors

## make

**Signature**

```ts
export declare const make: <A>(
  initial: A,
  fork?: (a: A) => A,
  join?: (left: A, right: A) => A
) => Effect<Scope, never, FiberRef<A>>
```

Added in v1.0.0

## makeEnvironment

**Signature**

```ts
export declare const makeEnvironment: <A>(initial: Context<A>) => Effect<Scope, never, FiberRef<Context<A>>>
```

Added in v1.0.0

## makeRuntimeFlags

**Signature**

```ts
export declare const makeRuntimeFlags: (initial: RuntimeFlags) => Effect<Scope, never, FiberRef<RuntimeFlags>>
```

Added in v1.0.0

## makeWith

**Signature**

```ts
export declare const makeWith: <Value>(ref: () => FiberRef<Value>) => Effect<Scope, never, FiberRef<Value>>
```

Added in v1.0.0

## unsafeMake

**Signature**

```ts
export declare const unsafeMake: <Value>(
  initial: Value,
  fork?: (a: Value) => Value,
  join?: (left: Value, right: Value) => Value
) => FiberRef<Value>
```

Added in v1.0.0

## unsafeMakeEnvironment

**Signature**

```ts
export declare const unsafeMakeEnvironment: <A>(initial: Context<A>) => FiberRef<Context<A>>
```

Added in v1.0.0

## unsafeMakeHashSet

**Signature**

```ts
export declare const unsafeMakeHashSet: <A>(initial: HashSet<A>) => FiberRef<HashSet<A>>
```

Added in v1.0.0

## unsafeMakePatch

**Signature**

```ts
export declare const unsafeMakePatch: <Value, Patch>(
  initial: Value,
  differ: Differ<Value, Patch>,
  fork: Patch,
  join?: (oldV: Value, newV: Value) => Value
) => FiberRef<Value>
```

Added in v1.0.0

## unsafeMakeSupervisor

**Signature**

```ts
export declare const unsafeMakeSupervisor: (initial: Supervisor<any>) => FiberRef<Supervisor<any>>
```

Added in v1.0.0

# fiberRefs

## currentEnvironment

**Signature**

```ts
export declare const currentEnvironment: FiberRef<Context<never>>
```

Added in v1.0.0

## currentLogAnnotations

**Signature**

```ts
export declare const currentLogAnnotations: FiberRef<ReadonlyMap<string, string>>
```

Added in v1.0.0

## currentLogLevel

**Signature**

```ts
export declare const currentLogLevel: FiberRef<LogLevel>
```

Added in v1.0.0

## currentLogSpan

**Signature**

```ts
export declare const currentLogSpan: FiberRef<List<LogSpan>>
```

Added in v1.0.0

## currentLoggers

**Signature**

```ts
export declare const currentLoggers: FiberRef<HashSet<Logger<string, any>>>
```

Added in v1.0.0

## currentParallelism

**Signature**

```ts
export declare const currentParallelism: FiberRef<Option<number>>
```

Added in v1.0.0

## currentRuntimeFlags

**Signature**

```ts
export declare const currentRuntimeFlags: FiberRef<RuntimeFlags>
```

Added in v1.0.0

## currentScheduler

**Signature**

```ts
export declare const currentScheduler: FiberRef<Scheduler>
```

Added in v1.0.0

## currentSupervisor

**Signature**

```ts
export declare const currentSupervisor: FiberRef<Supervisor<any>>
```

Added in v1.0.0

## forkScopeOverride

**Signature**

```ts
export declare const forkScopeOverride: FiberRef<Option<FiberScope>>
```

Added in v1.0.0

## interruptedCause

**Signature**

```ts
export declare const interruptedCause: FiberRef<Cause<never>>
```

Added in v1.0.0

# getters

## get

**Signature**

```ts
export declare const get: <A>(self: FiberRef<A>) => Effect<never, never, A>
```

Added in v1.0.0

# model

## FiberRef (interface)

**Signature**

```ts
export interface FiberRef<A> extends Variance<A> {
  /** @internal */
  readonly initial: A
  /** @internal */
  readonly diff: (oldValue: A, newValue: A) => unknown
  /** @internal */
  readonly combine: (first: unknown, second: unknown) => unknown
  /** @internal */
  readonly patch: (patch: unknown) => (oldValue: A) => A
  /** @internal */
  readonly fork: unknown
  /** @internal */
  readonly join: (oldValue: A, newValue: A) => A
}
```

Added in v1.0.0

# models

## Variance (interface)

**Signature**

```ts
export interface Variance<A> {
  readonly [FiberRefTypeId]: {
    readonly _A: (_: never) => A
  }
}
```

Added in v1.0.0

# mutations

## delete

**Signature**

```ts
export declare const delete: <A>(self: FiberRef<A>) => Effect<never, never, void>
```

Added in v1.0.0

## getAndSet

**Signature**

```ts
export declare const getAndSet: <A>(value: A) => (self: FiberRef<A>) => Effect<never, never, A>
```

Added in v1.0.0

## getAndUpdate

**Signature**

```ts
export declare const getAndUpdate: <A>(f: (a: A) => A) => (self: FiberRef<A>) => Effect<never, never, A>
```

Added in v1.0.0

## getAndUpdateSome

**Signature**

```ts
export declare const getAndUpdateSome: <A>(pf: (a: A) => Option<A>) => (self: FiberRef<A>) => Effect<never, never, A>
```

Added in v1.0.0

## getWith

**Signature**

```ts
export declare const getWith: <R, E, A, B>(f: (a: A) => Effect<R, E, B>) => (self: FiberRef<A>) => Effect<R, E, B>
```

Added in v1.0.0

## locally

**Signature**

```ts
export declare const locally: <A>(value: A) => (self: FiberRef<A>) => <R, E, B>(use: Effect<R, E, B>) => Effect<R, E, B>
```

Added in v1.0.0

## locallyScoped

**Signature**

```ts
export declare const locallyScoped: <A>(value: A) => (self: FiberRef<A>) => Effect<Scope, never, void>
```

Added in v1.0.0

## locallyScopedWith

**Signature**

```ts
export declare const locallyScopedWith: <A>(value: A) => (self: FiberRef<A>) => Effect<Scope, never, void>
```

Added in v1.0.0

## locallyWith

**Signature**

```ts
export declare const locallyWith: <A>(
  f: (a: A) => A
) => (self: FiberRef<A>) => <R, E, B>(use: Effect<R, E, B>) => Effect<R, E, B>
```

Added in v1.0.0

## modify

**Signature**

```ts
export declare const modify: <A, B>(f: (a: A) => readonly [B, A]) => (self: FiberRef<A>) => Effect<never, never, B>
```

Added in v1.0.0

## modifySome

**Signature**

```ts
export declare const modifySome: <B, A>(
  def: B,
  f: (a: A) => Option<readonly [B, A]>
) => (self: FiberRef<A>) => Effect<never, never, B>
```

Added in v1.0.0

## reset

**Signature**

```ts
export declare const reset: <A>(self: FiberRef<A>) => Effect<never, never, void>
```

Added in v1.0.0

## set

**Signature**

```ts
export declare const set: <A>(value: A) => (self: FiberRef<A>) => Effect<never, never, void>
```

Added in v1.0.0

## update

**Signature**

```ts
export declare const update: <A>(f: (a: A) => A) => (self: FiberRef<A>) => Effect<never, never, void>
```

Added in v1.0.0

## updateAndGet

**Signature**

```ts
export declare const updateAndGet: <A>(f: (a: A) => A) => (self: FiberRef<A>) => Effect<never, never, A>
```

Added in v1.0.0

## updateSome

**Signature**

```ts
export declare const updateSome: <A>(pf: (a: A) => Option<A>) => (self: FiberRef<A>) => Effect<never, never, void>
```

Added in v1.0.0

## updateSomeAndGet

**Signature**

```ts
export declare const updateSomeAndGet: <A>(pf: (a: A) => Option<A>) => (self: FiberRef<A>) => Effect<never, never, A>
```

Added in v1.0.0

# symbols

## FiberRefTypeId

**Signature**

```ts
export declare const FiberRefTypeId: typeof FiberRefTypeId
```

Added in v1.0.0

## FiberRefTypeId (type alias)

**Signature**

```ts
export type FiberRefTypeId = typeof FiberRefTypeId
```

Added in v1.0.0