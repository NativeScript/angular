import { HmrCacheStore } from './hmr-cache-store';

describe('HmrCacheStore', () => {
  it('get/set/has/delete and LRU-evicts oldest entries', () => {
    const store = new HmrCacheStore([], { maxEntries: 2 });
    store.set('a', 1);
    store.set('b', 2);
    expect(store.get('a')).toBe(1);
    store.set('c', 3);
    expect(store.has('b')).toBe(false);
    expect(store.keys()).toEqual(['a', 'c']);
    store.delete('a');
    expect(store.size()).toBe(1);
    store.invalidate();
    expect(store.size()).toBe(0);
  });

  it('scopes keys and can clear only that prefix', () => {
    const store = new HmrCacheStore();
    const page = store.scope('page');
    page.set('items', [1]);
    store.set('other', true);
    expect(page.get('items')).toEqual([1]);
    expect(store.get('page:items')).toEqual([1]);
    expect(page.size()).toBe(1);
    page.clear();
    expect(store.has('other')).toBe(true);
    expect(page.has('items')).toBe(false);
    expect(() => store.scope('')).toThrow();
  });

  it('trims a seed that already exceeds maxEntries', () => {
    const store = new HmrCacheStore(
      [
        ['one', 1],
        ['two', 2],
        ['three', 3],
      ],
      { maxEntries: 2 },
    );
    expect(store.keys()).toEqual(['two', 'three']);
  });
});
