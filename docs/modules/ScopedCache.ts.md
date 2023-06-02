---
title: ScopedCache.ts
nav_order: 55
parent: Modules
---

## ScopedCache overview

Added in v1.0.0

---

<h2 class="text-delta">Table of contents</h2>

- [constructors](#constructors)
  - [make](#make)
  - [makeWith](#makewith)
- [models](#models)
  - [Lookup (type alias)](#lookup-type-alias)
  - [ScopedCache (interface)](#scopedcache-interface)
- [symbols](#symbols)
  - [ScopedCacheTypeId](#scopedcachetypeid)
  - [ScopedCacheTypeId (type alias)](#scopedcachetypeid-type-alias)

---

# constructors

## make

Constructs a new cache with the specified capacity, time to live, and
lookup function.

**Signature**

```ts
export declare const make: <Key, Environment, Error, Value>(
  capacity: number,
  timeToLive: Duration.Duration,
  lookup: Lookup<Key, Environment, Error, Value>
) => Effect.Effect<Scope.Scope | Environment, never, ScopedCache<Key, Error, Value>>
```

Added in v1.0.0

## makeWith

Constructs a new cache with the specified capacity, time to live, and
lookup function, where the time to live can depend on the `Exit` value
returned by the lookup function.

**Signature**

```ts
export declare const makeWith: <Key, Environment, Error, Value>(
  capacity: number,
  lookup: Lookup<Key, Environment, Error, Value>,
  timeToLive: (exit: Exit.Exit<Error, Value>) => Duration.Duration
) => Effect.Effect<Scope.Scope | Environment, never, ScopedCache<Key, Error, Value>>
```

Added in v1.0.0

# models

## Lookup (type alias)

Similar to `Cache.Lookup`, but executes the lookup function within a `Scope`.

**Signature**

```ts
export type Lookup<Key, Environment, Error, Value> = (
  key: Key
) => Effect.Effect<Environment | Scope.Scope, Error, Value>
```

Added in v1.0.0

## ScopedCache (interface)

**Signature**

```ts
export interface ScopedCache<Key, Error, Value> extends ScopedCache.Variance<Key, Error, Value> {
  /**
   * Retrieves the value associated with the specified key if it exists.
   * Otherwise returns `Option.none`.
   */
  getOption(key: Key): Effect.Effect<Scope.Scope, Error, Option.Option<Value>>

  /**
   * Returns statistics for this cache.
   */
  cacheStats(): Effect.Effect<never, never, Cache.CacheStats>

  /**
   * Return whether a resource associated with the specified key exists in the
   * cache. Sometime `contains` can return true if the resource is currently
   * being created but not yet totally created.
   */
  contains(key: Key): Effect.Effect<never, never, boolean>

  /**
   * Return statistics for the specified entry.
   */
  entryStats(key: Key): Effect.Effect<never, never, Option.Option<Cache.EntryStats>>

  /**
   * Gets the value from the cache if it exists or otherwise computes it, the
   * release action signals to the cache that the value is no longer being used
   * and can potentially be finalized subject to the policies of the cache.
   */
  get(key: Key): Effect.Effect<Scope.Scope, Error, Value>

  /**
   * Invalidates the resource associated with the specified key.
   */
  invalidate(key: Key): Effect.Effect<never, never, void>

  /**
   * Invalidates all values in the cache.
   */
  invalidateAll(): Effect.Effect<never, never, void>

  /**
   * Force the reuse of the lookup function to compute the returned scoped
   * effect associated with the specified key immediately. Once the new resource
   * is recomputed, the old resource associated to the key is cleaned (once all
   * fiber using it are done with it). During the time the new resource is
   * computed, concurrent call the .get will use the old resource if this one is
   * not expired.
   */
  refresh(key: Key): Effect.Effect<never, Error, void>

  /**
   * Returns the approximate number of values in the cache.
   */
  size(): Effect.Effect<never, never, number>
}
```

Added in v1.0.0

# symbols

## ScopedCacheTypeId

**Signature**

```ts
export declare const ScopedCacheTypeId: typeof ScopedCacheTypeId
```

Added in v1.0.0

## ScopedCacheTypeId (type alias)

**Signature**

```ts
export type ScopedCacheTypeId = typeof ScopedCacheTypeId
```

Added in v1.0.0