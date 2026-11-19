import { Injectable } from '@angular/core';
import { HmrCacheOptions, HmrCacheScope, HmrLruStore } from './lru-store';
import { isViteDevSession } from './vite-session';

// This package is never re-evaluated in a dev session, so module scope outlives every HMR reboot.
const sharedStore = new HmrLruStore();

/** Sets the cache options; applies immediately, evicting entries beyond a lower `maxEntries`. */
export function configureHmrCache(options: HmrCacheOptions): boolean {
  sharedStore.configure(options);
  return true;
}

/** @internal Read-only access for the deprecated `__NS_NG_HMR__` view. */
export function hmrCacheStore(): HmrLruStore {
  return sharedStore;
}

/**
 * App-wide key/value cache that survives HMR reboots, so screens can keep expensive state
 * (fetched data, scroll positions) while editing. An app restart clears it. Outside a Vite dev
 * session it is a plain in-memory LRU cache.
 */
@Injectable({ providedIn: 'root' })
export class HmrCacheService {
  /** True inside a Vite dev session. */
  readonly isHmr: boolean = isViteDevSession();

  get<T>(key: string): T | undefined {
    return sharedStore.get<T>(key);
  }

  set<T>(key: string, value: T): void {
    sharedStore.set(key, value);
  }

  has(key: string): boolean {
    return sharedStore.has(key);
  }

  delete(key: string): void {
    sharedStore.delete(key);
  }

  clear(): void {
    sharedStore.clear();
  }

  size(): number {
    return sharedStore.size();
  }

  keys(): string[] {
    return sharedStore.keys();
  }

  /** View of the cache whose keys are prefixed with `name:`. */
  scope(name: string): HmrCacheScope {
    return sharedStore.scope(name);
  }
}
