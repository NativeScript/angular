// Runtime-import free so it can be unit tested without Angular or NativeScript.

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

export const DEFAULT_HMR_CACHE_MAX_ENTRIES = 256;

/** Key/value store that evicts its least recently used entries beyond `maxEntries`. */
export class HmrLruStore {
  private readonly entries = new Map<string, unknown>();
  private maxEntries = DEFAULT_HMR_CACHE_MAX_ENTRIES;

  configure(options: HmrCacheOptions): void {
    if (options.maxEntries !== undefined) {
      this.maxEntries = Math.max(0, Math.floor(options.maxEntries));
      this.evict();
    }
  }

  get<T>(key: string): T | undefined {
    if (!this.entries.has(key)) {
      return undefined;
    }
    const value = this.entries.get(key);
    this.entries.delete(key);
    this.entries.set(key, value);
    return value as T;
  }

  set<T>(key: string, value: T): void {
    this.entries.delete(key);
    this.entries.set(key, value);
    this.evict();
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

  /** A copy of the entries, oldest first, without marking any as used. */
  snapshot(): Map<string, unknown> {
    return new Map(this.entries);
  }

  /** View of the store whose keys are prefixed with `name:`. */
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

  private evict(): void {
    if (this.maxEntries <= 0) {
      return;
    }
    for (const oldest of this.entries.keys()) {
      if (this.entries.size <= this.maxEntries) {
        break;
      }
      this.entries.delete(oldest);
    }
  }
}
