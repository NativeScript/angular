import { clearRouteConfigCaches } from './route-config-cache';

describe('clearRouteConfigCaches', () => {
  it('clears the router caches of nested and lazily loaded routes and destroys their injectors', () => {
    const destroy = jest.fn();
    const lazyChild: Record<string, unknown> = { path: 'lazy-child', _loadedComponent: class {} };
    const child: Record<string, unknown> = { path: 'child', _injector: { destroy } };
    const parent: Record<string, unknown> = {
      path: 'parent',
      children: [child],
      _loadedRoutes: [lazyChild],
      _loadedInjector: { destroy },
      _loadedNgModuleFactory: {},
    };
    clearRouteConfigCaches([parent]);
    expect(parent).toEqual({ path: 'parent', children: [child] });
    expect(child).toEqual({ path: 'child' });
    expect(lazyChild).toEqual({ path: 'lazy-child' });
    expect(destroy).toHaveBeenCalledTimes(2);
  });

  it('tolerates an injector the router already destroyed, cycles and empty input', () => {
    const route: Record<string, unknown> = {
      _injector: {
        destroy: () => {
          throw new Error('NG0205');
        },
      },
    };
    route.children = [route];
    expect(() => clearRouteConfigCaches([route, null, 'x'])).not.toThrow();
    expect('_injector' in route).toBe(false);
    expect(() => clearRouteConfigCaches(undefined)).not.toThrow();
  });
});
