jest.mock('@angular/core', () => ({
  Injectable: () => (target: unknown) => target,
}));
jest.mock('./vite-session', () => ({ isViteDevSession: () => false }));

import { configureHmrCache, HmrCacheService } from './cache';

describe('HmrCacheService', () => {
  it('shares one module-scoped store between instances, as a rebooted app gets a new instance', () => {
    const before = new HmrCacheService();
    before.scope('screen').set('scroll', 120);
    const after = new HmrCacheService();
    expect(after.scope('screen').get('scroll')).toBe(120);
    expect(after.isHmr).toBe(false);
  });

  it('applies options to the shared store', () => {
    const cache = new HmrCacheService();
    cache.clear();
    expect(configureHmrCache({ maxEntries: 1 })).toBe(true);
    cache.set('a', 1);
    cache.set('b', 2);
    expect(cache.keys()).toEqual(['b']);
    configureHmrCache({ maxEntries: 256 });
  });
});
