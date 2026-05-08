/**
 * Framework-agnostic Hot-Module-Replacement state cache.
 *
 * The {@link HmrCacheStore} class is intentionally free of any Angular
 * imports so a future `@nativescript/solid` (or any other framework
 * binding) can lift this file as-is and wrap it with its own DI
 * primitive. The Angular DI wrapper lives in
 * `./hmr-cache.service.ts`.
 *
 * # What it does
 *
 * The NativeScript iOS runtime exposes a Vite-spec compliant
 * `import.meta.hot` on every imported module (see
 * `@nativescript/ios` →
 * `runtime/HMRSupport.{h,mm}::InitializeImportMetaHot`). The runtime
 * keeps a per-module persistent `data` object alive in C++ across V8
 * evaluation cycles and canonicalizes the module path so the same
 * bucket survives the URL variations Vite cycles through during a
 * save (HMR boot/live tags, versioned bridge paths, common script
 * extensions). When `@nativescript/vite`'s Angular HMR client calls
 * `globalThis.__nsRunHmrDispose()` before `__reboot_ng_modules__`,
 * every registered `dispose(cb)` fires and is handed the same `data`
 * object the next module evaluation will read from.
 *
 * `HmrCacheStore` rides on top of that primitive:
 *
 *   1. On construction, it copies any previously-stashed entries out
 *      of `import.meta.hot.data['ns-hmr-cache']` (or whatever
 *      `storageKey` the caller picked) into an in-memory `Map`.
 *   2. It registers a single `import.meta.hot.dispose` callback that
 *      writes the in-memory `Map` back as a plain object before the
 *      next reboot.
 *   3. Every `set` re-orders the key to the end of the `Map` (LRU);
 *      when `size > maxEntries`, the oldest entry is evicted. This
 *      stops a long dev session from accumulating unbounded state for
 *      features the developer no longer touches.
 *   4. It subscribes to a custom HMR event (default
 *      `'ns:cache-invalidate'`) so a Vite plugin or dev server can
 *      push targeted cache evictions — e.g. "the OData schema for
 *      `/safety/forms` changed, drop anything that depends on it".
 *
 * In production / `--no-hmr` builds `import.meta.hot` is `undefined`,
 * the store collapses to a pure in-memory cache that lives for the
 * lifetime of the process, and the public API is identical so callers
 * never need to special-case build modes.
 *
 * # Why a class and not a plain object
 *
 * Encapsulating the LRU bookkeeping behind named methods (`get`,
 * `set`, `invalidate`, `scope`) lets us evolve the eviction policy
 * (e.g. add TTLs, weighted entries, structured-clone enforcement)
 * without touching every call site. The framework wrappers expose
 * the same surface so app authors learn one API regardless of which
 * framework they use.
 */

const DEFAULT_MAX_ENTRIES = 256;
const DEFAULT_STORAGE_KEY = 'ns-hmr-cache';
const DEFAULT_INVALIDATE_EVENT = 'ns:cache-invalidate';

/**
 * Minimal Vite-spec `import.meta.hot` shape — declared locally so the
 * package builds and types-checks without depending on `vite/client`
 * (which would be a phantom dep for webpack-only consumers and a
 * fragile assumption for contributors who don't have vite hoisted into
 * their `node_modules`). The full Vite spec is much larger; we only
 * type the methods we actually call.
 *
 * Compatible-by-construction with `vite/client`'s richer
 * `ViteHotContext` — apps that DO reference `vite/client` get the
 * superset and continue to work; we just don't require it.
 */
interface NsHotContext {
  readonly data: Record<string, unknown>;
  dispose: (cb: (data: Record<string, unknown>) => void) => void;
  on?: (event: string, cb: (payload: unknown) => void) => void;
}

/**
 * Read `import.meta.hot` defensively so the package compiles even
 * under TypeScript configs that don't extend an `ImportMeta` interface
 * with a `hot` field. The cast goes through `unknown` so the local
 * type is the only one in play; `vite/client`-aware apps still get
 * their own typing on `import.meta.hot` at every call site outside
 * this module.
 */
function readImportMetaHot(): NsHotContext | undefined {
  try {
    const meta =
      typeof import.meta !== 'undefined'
        ? (import.meta as unknown as { hot?: NsHotContext })
        : undefined;
    return meta?.hot;
  } catch {
    return undefined;
  }
}

export interface HmrCacheStoreOptions {
  /**
   * Maximum number of entries to keep before LRU-evicting the
   * oldest. Set to `0` (or any non-positive number) for unlimited.
   * Default: `256`.
   *
   * Sized for the empirical "depth of features a developer touches in
   * one dev session" — large enough that a working set of ~30 pages,
   * each with a handful of cached fields, never trips eviction during
   * normal hacking; small enough that a runaway producer (e.g. a
   * scroll-driven loop that mints new keys) gets capped instead of
   * leaking memory until the simulator OOMs.
   */
  maxEntries?: number;
  /**
   * Key under which the cache is stashed on `import.meta.hot.data`.
   * Apps that run multiple isolated cache stores (e.g. a feature-
   * isolation plugin) can pick distinct keys to keep their state
   * separate. Default: `'ns-hmr-cache'`.
   */
  storageKey?: string;
  /**
   * Custom HMR event name the store listens for. Payload schema:
   *
   * ```ts
   * { key?: string }
   * ```
   *
   * If `key` is provided, only that entry is dropped. If omitted, the
   * entire cache is cleared. A Vite plugin sends events via the dev
   * server's WebSocket (Vite spec
   * [`server.ws.send`](https://vite.dev/guide/api-plugin.html#server-ws-send-and-server-ws-on));
   * the runtime's `__NS_DISPATCH_HOT_EVENT__` then forwards them to
   * every `import.meta.hot.on` listener. Default:
   * `'ns:cache-invalidate'`.
   */
  invalidateEventName?: string;
  /**
   * Optional logger for diagnostic output. The store calls this with
   * a single string per significant event (rehydrate, dispose, LRU
   * evict, server-side invalidate). Default: no-op.
   */
  log?: (message: string) => void;
}

/**
 * A namespaced view of an {@link HmrCacheStore}. Keys are
 * automatically prefixed with `<scope>:`, so callers don't have to
 * negotiate global key names. Returned by {@link HmrCacheStore.scope}.
 */
export interface HmrCacheScope {
  readonly prefix: string;
  get<T>(key: string): T | undefined;
  set<T>(key: string, value: T): void;
  has(key: string): boolean;
  delete(key: string): void;
  /** Drop every entry whose key starts with this scope's prefix. */
  clear(): void;
  /** Number of entries owned by this scope. */
  size(): number;
}

export class HmrCacheStore {
  private readonly _map: Map<string, unknown>;
  private readonly _maxEntries: number;
  private readonly _log: (message: string) => void;

  /**
   * @param initialEntries Entries to seed the store with (typically
   *   the previous session's snapshot read from
   *   `import.meta.hot.data`).
   * @param options See {@link HmrCacheStoreOptions}.
   */
  constructor(
    initialEntries: Iterable<[string, unknown]> = [],
    options: HmrCacheStoreOptions = {}
  ) {
    this._map = new Map(initialEntries);
    const requested = options.maxEntries;
    this._maxEntries =
      typeof requested === 'number' && requested > 0
        ? Math.floor(requested)
        : 0;
    this._log = options.log ?? (() => {});
    // Trim seed if it overshoots the configured ceiling — possible if
    // a previous session ran with a larger `maxEntries` than this one.
    this._enforceMaxEntries();
  }

  get<T>(key: string): T | undefined {
    if (!this._map.has(key)) {
      return undefined;
    }
    // LRU touch: re-insert so the entry moves to the end of the
    // insertion-order Map.
    const value = this._map.get(key);
    this._map.delete(key);
    this._map.set(key, value);
    return value as T;
  }

  set<T>(key: string, value: T): void {
    if (this._map.has(key)) {
      // Delete-then-set keeps insertion order monotonic.
      this._map.delete(key);
    }
    this._map.set(key, value);
    this._enforceMaxEntries();
  }

  has(key: string): boolean {
    return this._map.has(key);
  }

  delete(key: string): void {
    this._map.delete(key);
  }

  /**
   * Drop a specific entry, or every entry when `key` is omitted.
   * Equivalent to {@link delete} (with key) or {@link clear} (without)
   * — exposed as a single method so callers and event handlers can
   * forward an optional key without branching.
   */
  invalidate(key?: string): void {
    if (key === undefined || key === null) {
      this.clear();
      return;
    }
    this.delete(key);
  }

  /** Drop every cached entry. */
  clear(): void {
    this._map.clear();
  }

  /** Total number of cached entries across all scopes. */
  size(): number {
    return this._map.size;
  }

  /** Snapshot of every key currently in the cache. */
  keys(): string[] {
    return Array.from(this._map.keys());
  }

  /**
   * Returns a namespaced view of this store. All keys passed to the
   * returned object are auto-prefixed with `<prefix>:`. Useful so
   * each feature module can avoid stomping on neighbours' keys
   * without repeating the prefix at every call site.
   *
   * @example
   * ```ts
   * const cache = createDefaultHmrCacheStore();
   * const submissions = cache.scope('page-my-submissions');
   * submissions.set('items', [...]); // stored under 'page-my-submissions:items'
   * ```
   */
  scope(prefix: string): HmrCacheScope {
    if (!prefix) {
      throw new Error('[HmrCacheStore] scope() requires a non-empty prefix');
    }
    const fullPrefix = `${prefix}:`;
    const parent = this;
    return {
      prefix: fullPrefix,
      get<T>(key: string): T | undefined {
        return parent.get<T>(fullPrefix + key);
      },
      set<T>(key: string, value: T): void {
        parent.set<T>(fullPrefix + key, value);
      },
      has(key: string): boolean {
        return parent.has(fullPrefix + key);
      },
      delete(key: string): void {
        parent.delete(fullPrefix + key);
      },
      clear(): void {
        for (const k of parent.keys()) {
          if (k.startsWith(fullPrefix)) {
            parent.delete(k);
          }
        }
      },
      size(): number {
        let n = 0;
        for (const k of parent.keys()) {
          if (k.startsWith(fullPrefix)) {
            n++;
          }
        }
        return n;
      },
    };
  }

  /**
   * Serialize every entry into a plain object suitable for stashing
   * on `import.meta.hot.data`. Used by the dispose callback in
   * {@link createDefaultHmrCacheStore} and re-exported for callers
   * that want to integrate with another persistence layer (e.g. a
   * test harness that snapshots between cases).
   */
  toObject(): Record<string, unknown> {
    const out: Record<string, unknown> = {};
    for (const [k, v] of this._map.entries()) {
      out[k] = v;
    }
    return out;
  }

  private _enforceMaxEntries(): void {
    if (this._maxEntries <= 0) {
      return;
    }
    while (this._map.size > this._maxEntries) {
      const oldestKey = this._map.keys().next().value;
      if (oldestKey === undefined) {
        return;
      }
      this._map.delete(oldestKey);
      this._log(
        `[HmrCacheStore] evicted oldest key="${oldestKey}" (size now ${this._map.size}/${this._maxEntries})`
      );
    }
  }
}

/**
 * Build an {@link HmrCacheStore} bound to the current module's
 * `import.meta.hot` context — i.e. the store's data survives HMR
 * reboots and listens for the `'ns:cache-invalidate'` custom event.
 *
 * Caller responsibility: invoke this from the module that "owns" the
 * cache. `import.meta` is per-module, so the dispose callback will be
 * registered against whichever module physically calls this function.
 * In `@nativescript/angular` the canonical owner is
 * `hmr-cache.service.ts`; in `@nativescript/solid` it would be the
 * equivalent solid-side module.
 *
 * Returns a freshly-constructed store. Callers should treat it as a
 * singleton — calling this twice from the same module yields two
 * independent stores, which is almost never what you want.
 */
export function createDefaultHmrCacheStore(
  options: HmrCacheStoreOptions = {}
): HmrCacheStore {
  const storageKey = options.storageKey ?? DEFAULT_STORAGE_KEY;
  const invalidateEventName =
    options.invalidateEventName ?? DEFAULT_INVALIDATE_EVENT;
  const maxEntries = options.maxEntries ?? DEFAULT_MAX_ENTRIES;
  const log = options.log ?? (() => {});

  const hot = readImportMetaHot();

  // Read previous session's snapshot (if any) and seed the store.
  const previousSnapshot = ((hot?.data as Record<string, unknown> | undefined)
    ?.[storageKey] ?? {}) as Record<string, unknown>;
  const previousEntries = Object.entries(previousSnapshot);

  const store = new HmrCacheStore(previousEntries, {
    maxEntries,
    storageKey,
    invalidateEventName,
    log,
  });

  if (hot) {
    if (previousEntries.length) {
      log(
        `[HmrCacheStore] rehydrated ${previousEntries.length} entr${
          previousEntries.length === 1 ? 'y' : 'ies'
        } from previous HMR session (storageKey="${storageKey}")`
      );
    }
    // Stash the live store back on dispose so the next reboot finds
    // exactly what's in memory right now.
    hot.dispose((data) => {
      const snapshot = store.toObject();
      (data as Record<string, unknown>)[storageKey] = snapshot;
      log(
        `[HmrCacheStore] dispose stashed ${Object.keys(snapshot).length} entr${
          Object.keys(snapshot).length === 1 ? 'y' : 'ies'
        } (storageKey="${storageKey}")`
      );
    });
    // Listen for server-side invalidation events. Vite plugins push
    // these via `server.ws.send({ type: 'custom', event: 'ns:cache-invalidate', data: { key? } })`.
    // The HMR client forwards them to `import.meta.hot.on`. If the
    // runtime doesn't expose `on` (older `@nativescript/ios`), this
    // is a clean no-op.
    if (typeof hot.on === 'function') {
      hot.on(invalidateEventName, (payload: { key?: string } | undefined) => {
        const targetKey = payload?.key;
        store.invalidate(targetKey);
        log(
          targetKey
            ? `[HmrCacheStore] server-side invalidate dropped key="${targetKey}"`
            : `[HmrCacheStore] server-side invalidate cleared all entries`
        );
      });
    }
  }

  return store;
}
