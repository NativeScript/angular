export interface HmrCacheScope {
  readonly prefix: string;
  get<T>(key: string): T | undefined;
  set<T>(key: string, value: T): void;
  has(key: string): boolean;
  delete(key: string): void;
  clear(): void;
  size(): number;
}

export class HmrCacheStore {
  private readonly _map: Map<string, unknown>;
  private readonly _maxEntries: number;
  private readonly _log: (message: string) => void;

  constructor(initialEntries: Iterable<[string, unknown]> = [], options: { maxEntries?: number; log?: (message: string) => void } = {}) {
    this._map = new Map(initialEntries);
    const requested = options.maxEntries;
    this._maxEntries = typeof requested === 'number' && requested > 0 ? Math.floor(requested) : 0;
    this._log = options.log ?? (() => undefined);
    this._enforceMaxEntries();
  }

  get<T>(key: string): T | undefined {
    if (!this._map.has(key)) {
      return undefined;
    }
    const value = this._map.get(key);
    this._map.delete(key);
    this._map.set(key, value);
    return value as T;
  }

  set<T>(key: string, value: T): void {
    if (this._map.has(key)) {
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

  invalidate(key?: string): void {
    if (key === undefined || key === null) {
      this.clear();
      return;
    }
    this.delete(key);
  }

  clear(): void {
    this._map.clear();
  }

  size(): number {
    return this._map.size;
  }

  keys(): string[] {
    return Array.from(this._map.keys());
  }

  scope(prefix: string): HmrCacheScope {
    if (!prefix) {
      throw new Error('[HmrCache] scope() requires a non-empty prefix');
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
      this._log(`[HmrCache] evicted oldest key="${oldestKey}" (size now ${this._map.size}/${this._maxEntries})`);
    }
  }
}
