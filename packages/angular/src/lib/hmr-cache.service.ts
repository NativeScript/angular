import { Injectable } from '@angular/core';
import {
  createDefaultHmrCacheStore,
  HmrCacheScope,
  HmrCacheStore,
  HmrCacheStoreOptions,
} from './hmr-cache-store';
import { isAngularHmrEnabled } from './hmr-environment';
import { NativeScriptDebug } from './trace';

/**
 * Skip the API call your component already paid for last save.
 *
 * Inject {@link HmrCacheService} from any Angular component or service
 * to read and write a per-app key/value cache that **survives the
 * `__reboot_ng_modules__` cycle** triggered by every HMR file save.
 * Backed by `@nativescript/ios`'s native `import.meta.hot.data`
 * (`runtime/HMRSupport.{h,mm}`) and drained via
 * `@nativescript/vite`'s `globalThis.__nsRunHmrDispose()` hook before
 * Angular tears down its realm, so the same value the previous
 * component instance produced is handed straight to the freshly-
 * instantiated one — no network round-trip, no spinner flash.
 *
 * In production / `--no-hmr` builds `import.meta.hot` is `undefined`
 * and the cache collapses to a plain in-memory object that lives for
 * the lifetime of the process. The public API is identical, so callers
 * never need to special-case build modes.
 *
 * @example Skip the initial fetch on save
 * ```ts
 * import { HmrCacheService } from '@nativescript/angular';
 *
 * @Component({...})
 * export class MyComponent implements OnInit {
 *   private hmrCache = inject(HmrCacheService);
 *
 *   ngOnInit() {
 *     const cached = this.hmrCache.get<MyResult>('my-feature:items');
 *     if (cached) {
 *       this.applyResult(cached);
 *       return;
 *     }
 *     this.api.load().subscribe((result) => {
 *       this.hmrCache.set('my-feature:items', result);
 *       this.applyResult(result);
 *     });
 *   }
 * }
 * ```
 *
 * @example Namespaced via {@link scope}
 * ```ts
 * private cache = inject(HmrCacheService).scope('page-my-submissions');
 * // …
 * this.cache.set('items', items);   // → 'page-my-submissions:items'
 * this.cache.get('items');          // ← 'page-my-submissions:items'
 * ```
 *
 * @example Server-side invalidation from a Vite plugin
 * ```ts
 * // vite.config.ts
 * export default defineConfig({
 *   plugins: [
 *     {
 *       name: 'my-schema-watcher',
 *       configureServer(server) {
 *         server.watcher.on('change', (path) => {
 *           if (path.endsWith('schema.json')) {
 *             server.ws.send({
 *               type: 'custom',
 *               event: 'ns:cache-invalidate',
 *               data: { key: 'my-feature:items' },
 *             });
 *           }
 *         });
 *       },
 *     },
 *   ],
 * });
 * ```
 *
 * Memory ceiling: the cache LRU-evicts at 256 entries by default. Pass
 * a custom ceiling via {@link configureHmrCache} if your app churns
 * through more keys than that in a typical dev session, or set `0` for
 * unlimited (unbounded growth — only safe for short-lived dev work).
 *
 * @see HmrCacheStore — the framework-agnostic engine. Stable enough to
 *   lift into `@nativescript/solid` / other framework bindings without
 *   modification.
 */
@Injectable({ providedIn: 'root' })
export class HmrCacheService {
  private readonly _store = getOrCreateSharedStore();

  /**
   * `true` when `import.meta.hot` is wired (i.e. NativeScript Vite HMR
   * is active and `@nativescript/ios` is recent enough to expose
   * `import.meta.hot.data`). `false` in production / `--no-hmr` /
   * legacy webpack builds.
   *
   * Most callers should NOT branch on this — the public API works
   * identically in both cases. Use it only when you want to opt OUT
   * of caching in production (e.g. always fetch fresh data when not
   * developing).
   */
  readonly isHmr: boolean = isAngularHmrEnabled() && hasImportMetaHot();

  get<T>(key: string): T | undefined {
    return this._store.get<T>(key);
  }

  set<T>(key: string, value: T): void {
    this._store.set<T>(key, value);
  }

  has(key: string): boolean {
    return this._store.has(key);
  }

  delete(key: string): void {
    this._store.delete(key);
  }

  /**
   * Drop a single entry, or every entry when `key` is omitted. Same
   * shape as the `'ns:cache-invalidate'` HMR-event payload the store
   * listens for, so application code can call this directly to mirror
   * a server-side eviction.
   */
  invalidate(key?: string): void {
    this._store.invalidate(key);
  }

  /** Drop every cached entry. Equivalent to `invalidate()` with no key. */
  clear(): void {
    this._store.clear();
  }

  /** Total number of entries across every scope. */
  size(): number {
    return this._store.size();
  }

  /** Snapshot of every key currently cached. Useful for debug overlays. */
  keys(): string[] {
    return this._store.keys();
  }

  /**
   * Returns a namespaced view of the cache. All `get` / `set` /
   * `has` / `delete` calls on the returned object are auto-prefixed
   * with `<scopeName>:`. Recommended over global keys so feature
   * modules don't accidentally collide.
   *
   * @example
   * ```ts
   * private cache = inject(HmrCacheService).scope('page-my-submissions');
   * // …
   * this.cache.set('items', items); // → 'page-my-submissions:items'
   * ```
   */
  scope(scopeName: string): HmrCacheScope {
    return this._store.scope(scopeName);
  }
}

/**
 * Override the default cache configuration. Must be called BEFORE the
 * first injection of {@link HmrCacheService} (i.e. before Angular
 * bootstrap, or as the very first statement in `main.ts`); otherwise
 * the call is a no-op because the singleton store has already been
 * built with the previous (or default) options.
 *
 * Typical use case: bumping `maxEntries` for a large multi-feature
 * monorepo dev session, or pointing a custom `invalidateEventName` at
 * a Vite plugin that prefixes its events with the project name.
 *
 * Returns `true` if the configuration was applied, `false` if the
 * store had already been instantiated by an earlier injection.
 */
export function configureHmrCache(options: HmrCacheStoreOptions): boolean {
  if (sharedStore !== null) {
    return false;
  }
  pendingOptions = options;
  return true;
}

/**
 * Read-only access to the underlying {@link HmrCacheStore}. Exposed
 * for advanced integrations that want to reuse the LRU + dispose +
 * server-side-invalidate plumbing without going through Angular's
 * dependency injection (e.g. a non-component utility that's loaded
 * before the Angular platform has bootstrapped). Application code
 * should prefer {@link HmrCacheService}.
 */
export function getHmrCacheStore(): HmrCacheStore {
  return getOrCreateSharedStore();
}

let sharedStore: HmrCacheStore | null = null;
let pendingOptions: HmrCacheStoreOptions | null = null;

function getOrCreateSharedStore(): HmrCacheStore {
  if (sharedStore !== null) {
    return sharedStore;
  }
  const options: HmrCacheStoreOptions = {
    log: (msg) => {
      // Keep cache diagnostics on the same channel as other HMR
      // helpers so devs can grep one trace category and see the full
      // picture during a save cycle. NativeScriptDebug.bootstrapLog
      // is the conventional sink for HMR-adjacent lifecycle logs.
      try {
        NativeScriptDebug.bootstrapLog(msg);
      } catch {
        // Defensive: never crash the cache if the trace channel is
        // unavailable (e.g. tests that import this file in isolation).
      }
    },
    ...pendingOptions,
  };
  sharedStore = createDefaultHmrCacheStore(options);
  pendingOptions = null;
  return sharedStore;
}

function hasImportMetaHot(): boolean {
  try {
    // Member-expression access only — webpack rewrites `import.meta['hot']`
    // to `undefined` in CommonJS bundles (so `!!undefined` → `false`),
    // while Vite leaves it as the per-module hot context. A bare
    // `typeof import.meta` would survive into the bundle and crash V8
    // with "Cannot use 'import.meta' outside a module" on `require()`.
    return !!(import.meta as unknown as { hot?: unknown })['hot'];
  } catch {
    return false;
  }
}

// Re-export the engine types so consumers don't have to dig into the
// internal sub-path. Mirror this in the `public_api.ts` barrel.
export {
  createDefaultHmrCacheStore,
  HmrCacheScope,
  HmrCacheStore,
  HmrCacheStoreOptions,
};
