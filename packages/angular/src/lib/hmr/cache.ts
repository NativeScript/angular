import { Injectable } from '@angular/core';
import { hmrState, isHmrActive } from './hmr';

export interface HmrCacheOptions {
  /** Least recently used entries beyond this count are evicted. Defaults to 256; 0 disables the limit. */
  maxEntries?: number;
}

export interface HmrCacheScope {
  readonly prefix: string;
  get<T>(key: string): T | undefined;
  set<T>(key: string, value: T): void;
  has(key: string): boolean;
  delete(key: string): void;
  clear(): void;
  size(): number;
}

let maxEntries = 256;
let entries: Map<string, unknown> | undefined;

function sharedEntries(): Map<string, unknown> {
  if (!entries) {
    // In dev the map lives in HMR state so it survives reboots even if this module is re-evaluated.
    entries =
      typeof ngDevMode === 'undefined' || ngDevMode
        ? ((hmrState().cache ??= new Map()) as Map<string, unknown>)
        : new Map();
  }
  return entries;
}

/**
 * Sets cache options. Only applies before the cache is first used.
 * @returns false when the cache is already in use.
 */
export function configureHmrCache(options: HmrCacheOptions): boolean {
  if (entries) {
    return false;
  }
  maxEntries = Math.max(0, Math.floor(options.maxEntries ?? maxEntries));
  return true;
}

/**
 * App-wide key/value cache that survives HMR reboots, so screens can keep expensive state
 * (fetched data, scroll positions) while editing. In release builds it is a plain in-memory LRU cache.
 */
@Injectable({ providedIn: 'root' })
export class HmrCacheService {
  /** True when running inside a live HMR session. */
  readonly isHmr: boolean = (typeof ngDevMode === 'undefined' || !!ngDevMode) && isHmrActive();
  private readonly entries = sharedEntries();

  get<T>(key: string): T | undefined {
    if (!this.entries.has(key)) {
      return undefined;
    }
    const value = this.entries.get(key);
    // Re-insert to mark as most recently used.
    this.entries.delete(key);
    this.entries.set(key, value);
    return value as T;
  }

  set<T>(key: string, value: T): void {
    this.entries.delete(key);
    this.entries.set(key, value);
    if (maxEntries > 0) {
      for (const oldest of this.entries.keys()) {
        if (this.entries.size <= maxEntries) {
          break;
        }
        this.entries.delete(oldest);
      }
    }
  }

  has(key: string): boolean {
    return this.entries.has(key);
  }

  delete(key: string): void {
    this.entries.delete(key);
  }

  clear(): void {
    this.entries.clear();
  }

  size(): number {
    return this.entries.size;
  }

  keys(): string[] {
    return [...this.entries.keys()];
  }

  /** View of the cache whose keys are prefixed with `name:`. */
  scope(name: string): HmrCacheScope {
    if (!name) {
      throw new Error('[HmrCache] scope() requires a non-empty name');
    }
    const prefix = `${name}:`;
    const scopedKeys = () => this.keys().filter((k) => k.startsWith(prefix));
    return {
      prefix,
      get: (key) => this.get(prefix + key),
      set: (key, value) => this.set(prefix + key, value),
      has: (key) => this.has(prefix + key),
      delete: (key) => this.delete(prefix + key),
      clear: () => scopedKeys().forEach((k) => this.delete(k)),
      size: () => scopedKeys().length,
    };
  }
}
