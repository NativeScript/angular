import { clearAngularHmrRouteConfigCaches } from './hmr-route-cache-core';

describe('Angular HMR route cache clearing', () => {
  it('clears lazy route caches recursively while preserving public route fields', () => {
    const detailsInjectorDestroy = jest.fn();
    const surveyInjectorDestroy = jest.fn();
    const childInjectorDestroy = jest.fn();
    const loadedFactoryDestroy = jest.fn();
    const grandchild = {
      path: 'details',
      _loadedComponent: { name: 'DetailsComponent' },
      _loadedInjector: { token: 'details', destroy: detailsInjectorDestroy },
    };
    const child = {
      path: 'survey',
      children: [grandchild],
      _loadedComponent: { name: 'SurveyComponent' },
      _loadedInjector: { token: 'survey', destroy: surveyInjectorDestroy },
      _loadedNgModuleFactory: { token: 'survey-factory', destroy: loadedFactoryDestroy },
      _injector: { token: 'child-injector', destroy: childInjectorDestroy },
    };
    const route = {
      path: 'onboarding-flow',
      children: [child],
      _loadedRoutes: [
        {
          path: 'lazy',
          _loadedComponent: { name: 'LazyComponent' },
          _loadedRoutes: [
            {
              path: 'nested',
              _injector: { token: 'nested-injector' },
            },
          ],
        },
      ],
    };

    const cleared = clearAngularHmrRouteConfigCaches([route]);

    expect(cleared).toBe(10);
    expect(route.path).toBe('onboarding-flow');
    expect(child.path).toBe('survey');
    expect(grandchild.path).toBe('details');
    expect(detailsInjectorDestroy).toHaveBeenCalledTimes(1);
    expect(surveyInjectorDestroy).toHaveBeenCalledTimes(1);
    expect(childInjectorDestroy).toHaveBeenCalledTimes(1);
    expect(loadedFactoryDestroy).toHaveBeenCalledTimes(1);
    expect((route as any)._loadedRoutes).toBeUndefined();
    expect((child as any)._loadedComponent).toBeUndefined();
    expect((child as any)._loadedInjector).toBeUndefined();
    expect((child as any)._loadedNgModuleFactory).toBeUndefined();
    expect((child as any)._injector).toBeUndefined();
    expect((grandchild as any)._loadedComponent).toBeUndefined();
    expect((grandchild as any)._loadedInjector).toBeUndefined();
  });

  it('does not loop forever when route graphs reuse the same child object', () => {
    const shared = {
      path: 'shared',
      _loadedComponent: { name: 'SharedComponent' },
    };
    const routes = [
      {
        path: 'a',
        children: [shared],
      },
      {
        path: 'b',
        _loadedRoutes: [shared],
      },
    ];

    const cleared = clearAngularHmrRouteConfigCaches(routes as any);

    expect(cleared).toBe(2);
    expect((shared as any)._loadedComponent).toBeUndefined();
  });
});