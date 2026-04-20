import { cloneRoutesForBootstrap } from './hmr-route-bootstrap-core';

describe('cloneRoutesForBootstrap', () => {
  it('drops private Angular router cache fields while preserving public route config', () => {
    const loadComponent = jest.fn();
    const canActivate = [jest.fn()];
    const routes = [
      {
        path: 'signup-landing',
        loadComponent,
        canActivate,
        data: { source: 'signup' },
        _loadedComponent: { stale: true },
        _loadedInjector: { stale: true },
        _loadedRoutes: [{ stale: true }],
        _injector: { stale: true },
        _loadedNgModuleFactory: { stale: true },
        ɵrouterPageId: 'stale',
        children: [
          {
            path: 'child',
            loadChildren: jest.fn(),
            _loadedComponent: { nested: true },
          },
        ],
      },
    ] as any;

    const cloned = cloneRoutesForBootstrap(routes);

    expect(cloned).not.toBe(routes);
    expect(cloned[0]).not.toBe(routes[0]);
    expect(cloned[0].loadComponent).toBe(loadComponent);
    expect(cloned[0].canActivate).toEqual(canActivate);
    expect(cloned[0].canActivate).not.toBe(canActivate);
    expect(cloned[0].data).toEqual({ source: 'signup' });
    expect(cloned[0].data).not.toBe(routes[0].data);
    expect(cloned[0]._loadedComponent).toBeUndefined();
    expect(cloned[0]._loadedInjector).toBeUndefined();
    expect(cloned[0]._loadedRoutes).toBeUndefined();
    expect(cloned[0]._injector).toBeUndefined();
    expect(cloned[0]._loadedNgModuleFactory).toBeUndefined();
    expect(cloned[0]['ɵrouterPageId']).toBeUndefined();
    expect(cloned[0].children).toEqual([
      {
        path: 'child',
        loadChildren: routes[0].children[0].loadChildren,
      },
    ]);
    expect(cloned[0].children).not.toBe(routes[0].children);
    expect(cloned[0].children[0]).not.toBe(routes[0].children[0]);
  });

  it('returns an empty array when routes are missing', () => {
    expect(cloneRoutesForBootstrap(undefined)).toEqual([]);
    expect(cloneRoutesForBootstrap(null)).toEqual([]);
  });
});