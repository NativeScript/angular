jest.mock('@angular/core', () => ({
  Injectable: () => (target: unknown) => target,
  ɵresetCompiledComponents: jest.fn(),
}));
jest.mock('../trace', () => ({ NativeScriptDebug: { isLogEnabled: () => false } }));

let cacheModule: typeof import('./cache');

beforeEach(() => {
  jest.isolateModules(() => {
    cacheModule = require('./cache');
  });
  delete (globalThis as Record<string, unknown>).__NS_NG_HMR__;
});

describe('HmrCacheService', () => {
  it('evicts the least recently used entries beyond maxEntries', () => {
    expect(cacheModule.configureHmrCache({ maxEntries: 2 })).toBe(true);
    const cache = new cacheModule.HmrCacheService();
    cache.set('a', 1);
    cache.set('b', 2);
    expect(cache.get('a')).toBe(1);
    cache.set('c', 3);

    expect(cache.keys()).toEqual(['a', 'c']);
    expect(cacheModule.configureHmrCache({ maxEntries: 5 })).toBe(false);
  });

  it('shares entries between instances', () => {
    new cacheModule.HmrCacheService().set('k', 'v');
    expect(new cacheModule.HmrCacheService().get('k')).toBe('v');
  });

  it('scopes keys by prefix', () => {
    const cache = new cacheModule.HmrCacheService();
    const page = cache.scope('page');
    page.set('items', [1]);
    cache.set('other', true);

    expect(cache.get('page:items')).toEqual([1]);
    expect(page.size()).toBe(1);
    page.clear();
    expect(cache.keys()).toEqual(['other']);
    expect(() => cache.scope('')).toThrow();
  });
});
