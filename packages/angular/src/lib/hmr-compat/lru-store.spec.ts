import { HmrLruStore } from './lru-store';

describe('HmrLruStore', () => {
  it('evicts the least recently used entry, counting reads as use', () => {
    const store = new HmrLruStore();
    store.configure({ maxEntries: 2 });
    store.set('a', 1);
    store.set('b', 2);
    expect(store.get('a')).toBe(1);
    store.set('c', 3);
    expect(store.keys()).toEqual(['a', 'c']);
  });

  it('trims at once when maxEntries is lowered, and keeps everything with 0', () => {
    const store = new HmrLruStore();
    for (let i = 0; i < 5; i++) {
      store.set(`k${i}`, i);
    }
    store.configure({ maxEntries: 2 });
    expect(store.keys()).toEqual(['k3', 'k4']);
    store.configure({ maxEntries: 0 });
    for (let i = 0; i < 300; i++) {
      store.set(`n${i}`, i);
    }
    expect(store.size()).toBe(302);
  });

  it('scopes keys by prefix without touching other scopes', () => {
    const store = new HmrLruStore();
    const users = store.scope('users');
    users.set('1', { name: 'a' });
    store.scope('posts').set('1', 'post');
    expect(users.get('1')).toEqual({ name: 'a' });
    expect(users.size()).toBe(1);
    users.clear();
    expect(store.keys()).toEqual(['posts:1']);
    expect(() => store.scope('')).toThrow();
  });

  it('snapshots entries without changing their order', () => {
    const store = new HmrLruStore();
    store.set('a', 1);
    store.set('b', 2);
    expect([...store.snapshot().keys()]).toEqual(['a', 'b']);
    store.set('c', 3);
    expect(store.keys()).toEqual(['a', 'b', 'c']);
  });
});
