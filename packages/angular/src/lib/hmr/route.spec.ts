import { Subject } from 'rxjs';

class MockNavigationEnd {}
class MockNavigationCancel {}
class MockNavigationError {}
class MockRouter {}
class MockReuseStrategy {}

jest.mock('@angular/core', () => ({ ɵresetCompiledComponents: jest.fn() }));
jest.mock('@angular/router', () => ({
  NavigationEnd: MockNavigationEnd,
  NavigationCancel: MockNavigationCancel,
  NavigationError: MockNavigationError,
  Router: MockRouter,
}));
jest.mock('../legacy/router/ns-route-reuse-strategy', () => ({ NSRouteReuseStrategy: MockReuseStrategy }));
jest.mock('../trace', () => ({
  NativeScriptDebug: { isLogEnabled: () => false, hmrLog: jest.fn(), hmrLogError: jest.fn() },
}));

import { runHmrHooks } from './hmr';
import {
  clearRouteConfigCaches,
  consumeHmrStartPath,
  getAngularHmrRestoringRoute,
  isAngularHmrRestoringRoute,
  registerRouterHmrHooks,
} from './route';

function fakeRouter(url: string) {
  const events = new Subject<unknown>();
  const router = {
    url,
    config: [] as unknown[],
    navigated: false,
    events,
    getCurrentNavigation: () => null,
    navigateByUrl: jest.fn(() => Promise.resolve(true)),
  };
  const reuse = { clearAllCaches: jest.fn() };
  const injector = {
    get: (token: unknown) => (token === MockRouter ? router : token === MockReuseStrategy ? reuse : null),
  } as any;
  return { router, reuse, injector };
}

function reboot(url: string) {
  const { injector } = fakeRouter(url);
  runHmrHooks('beforeDispose', injector);
}

beforeEach(() => {
  jest.useFakeTimers();
  delete (globalThis as Record<string, unknown>).__NS_NG_HMR__;
  registerRouterHmrHooks();
});

afterEach(() => jest.useRealTimers());

describe('route restore', () => {
  it('has nothing to restore before a reboot', () => {
    expect(consumeHmrStartPath()).toBeUndefined();
    expect(isAngularHmrRestoringRoute()).toBe(false);
  });

  it('boots at the URL captured before the reboot, once', () => {
    const { reuse, injector } = fakeRouter('/settings/profile');
    runHmrHooks('beforeDispose', injector);

    expect(reuse.clearAllCaches).toHaveBeenCalled();
    expect(consumeHmrStartPath()).toBe('/settings/profile');
    expect(getAngularHmrRestoringRoute()).toBe('/settings/profile');
    expect(consumeHmrStartPath()).toBeUndefined();
  });

  it('boots named-outlet URLs at / and replays them after the initial navigation', async () => {
    reboot('/tabs/(home:feed//search:results)');
    expect(consumeHmrStartPath()).toBe('/');

    const { router, injector } = fakeRouter('/');
    runHmrHooks('afterBootstrap', injector);
    expect(router.navigateByUrl).not.toHaveBeenCalled();

    router.events.next(new MockNavigationEnd());
    await Promise.resolve();
    expect(router.navigateByUrl).toHaveBeenCalledWith('/tabs/(home:feed//search:results)');
  });

  it('keeps the restore window open until shortly after navigation settles', async () => {
    reboot('/detail/1');
    consumeHmrStartPath();
    const { router, injector } = fakeRouter('/detail/1');
    router.navigated = true;

    runHmrHooks('afterBootstrap', injector);
    await Promise.resolve();
    expect(isAngularHmrRestoringRoute()).toBe(true);

    jest.advanceTimersByTime(1000);
    expect(isAngularHmrRestoringRoute()).toBe(false);
  });

  it('re-captures the restore target when rebooting mid-restore', () => {
    reboot('/a/(side:panel)');
    consumeHmrStartPath();

    reboot('/');

    expect(consumeHmrStartPath()).toBe('/');
    expect(getAngularHmrRestoringRoute()).toBe('/a/(side:panel)');
  });

  it('ends the restore window if navigation never settles', () => {
    reboot('/x');
    consumeHmrStartPath();
    jest.advanceTimersByTime(10000);
    expect(isAngularHmrRestoringRoute()).toBe(false);
  });
});

describe('clearRouteConfigCaches', () => {
  it('drops router-private caches, destroying cached injectors, and keeps public config', () => {
    const destroy = jest.fn();
    const lazyChild: Record<string, unknown> = { path: 'lazy', _loadedComponent: class {} };
    const route: Record<string, unknown> = {
      path: 'a',
      data: { title: 'A' },
      _injector: { destroy },
      _loadedRoutes: [lazyChild],
      children: [{ path: 'b', _loadedComponent: class {} }],
    };

    clearRouteConfigCaches([route]);

    expect(destroy).toHaveBeenCalled();
    expect(route).toEqual({ path: 'a', data: { title: 'A' }, children: [{ path: 'b' }] });
    expect(lazyChild).toEqual({ path: 'lazy' });
  });
});
