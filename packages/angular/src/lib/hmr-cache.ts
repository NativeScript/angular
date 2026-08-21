import { Injectable } from '@angular/core';
import { isAngularHmrEnabled } from './hmr';
import { HmrCacheScope, HmrCacheStore } from './hmr-cache-store';
import { NativeScriptDebug } from './trace';

export type { HmrCacheScope } from './hmr-cache-store';

const DEFAULT_MAX_ENTRIES = 256;
const STORAGE_KEY = 'ns-hmr-cache';
const INVALIDATE_EVENT = 'ns:cache-invalidate';

interface NsHotContext {
  readonly data: Record<string, unknown>;
  dispose: (cb: (data: Record<string, unknown>) => void) => void;
  on?: (event: string, cb: (payload: unknown) => void) => void;
}

function readImportMetaHot(): NsHotContext | undefined {
  try {
    return (import.meta as unknown as { hot?: NsHotContext })['hot'];
  } catch {
    return undefined;
  }
}

export interface HmrCacheOptions {
  maxEntries?: number;
}

function createSharedStore(options: HmrCacheOptions & { log?: (message: string) => void } = {}): HmrCacheStore {
  const maxEntries = options.maxEntries ?? DEFAULT_MAX_ENTRIES;
  const log = options.log ?? (() => undefined);
  const hot = readImportMetaHot();
  const previousSnapshot = ((hot?.data as Record<string, unknown> | undefined)?.[STORAGE_KEY] ?? {}) as Record<string, unknown>;
  const store = new HmrCacheStore(Object.entries(previousSnapshot), { maxEntries, log });

  if (hot) {
    hot.dispose((data) => {
      (data as Record<string, unknown>)[STORAGE_KEY] = store.toObject();
    });
    if (typeof hot.on === 'function') {
      hot.on(INVALIDATE_EVENT, (payload: { key?: string } | undefined) => {
        store.invalidate(payload?.key);
      });
    }
  }

  return store;
}

let sharedStore: HmrCacheStore | null = null;
let pendingOptions: HmrCacheOptions | null = null;

function getOrCreateSharedStore(): HmrCacheStore {
  if (sharedStore !== null) {
    return sharedStore;
  }
  sharedStore = createSharedStore({
    log: (msg) => {
      try {
        NativeScriptDebug.bootstrapLog(msg);
      } catch {
        // ignore
      }
    },
    ...pendingOptions,
  });
  pendingOptions = null;
  return sharedStore;
}

/**
 * Set cache options before the first HmrCacheService inject.
 * @returns true if stored, false if the store already exists.
 */
export function configureHmrCache(options: HmrCacheOptions): boolean {
  if (sharedStore !== null) {
    return false;
  }
  pendingOptions = options;
  return true;
}

/**
 * Per-app key/value cache that survives `__reboot_ng_modules__`.
 */
@Injectable({ providedIn: 'root' })
export class HmrCacheService {
  private readonly _store = getOrCreateSharedStore();
  readonly isHmr: boolean = isAngularHmrEnabled() && !!readImportMetaHot();

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

  invalidate(key?: string): void {
    this._store.invalidate(key);
  }

  clear(): void {
    this._store.clear();
  }

  size(): number {
    return this._store.size();
  }

  keys(): string[] {
    return this._store.keys();
  }

  scope(scopeName: string): HmrCacheScope {
    return this._store.scope(scopeName);
  }
}
