jest.mock('@angular/core', () => ({
  Injectable: () => (target: unknown) => target,
}));

class MockNavigationStart {
  constructor(
    public id: number,
    public url: string,
    public navigationTrigger?: 'imperative' | 'popstate' | 'hashchange',
    public restoredState?: { navigationId: number } | null,
  ) {}
}
class MockNavigationEnd {
  constructor(
    public id: number,
    public url: string,
    public urlAfterRedirects: string,
  ) {}
}
class MockNavigationCancel {
  constructor(
    public id: number,
    public url: string,
    public reason: string,
  ) {}
}
class MockNavigationError {
  constructor(
    public id: number,
    public url: string,
    public error: unknown,
  ) {}
}

jest.mock('@angular/router', () => ({
  NavigationStart: MockNavigationStart,
  NavigationEnd: MockNavigationEnd,
  NavigationCancel: MockNavigationCancel,
  NavigationError: MockNavigationError,
  Router: class {},
}));

jest.mock('../../trace', () => ({
  NativeScriptDebug: {
    isLogEnabled: () => false,
    hmrLog: jest.fn(),
  },
}));

jest.mock('../../hmr', () => ({
  isAngularHmrEnabled: () => true,
}));

import { Subject } from 'rxjs';
import {
  beginAngularHmrRouteRestore,
  captureAngularHmrPendingStartPath,
  clearAngularHmrRouteConfigCaches,
  cloneRoutesForBootstrap,
  endAngularHmrRouteRestore,
  getAngularHmrRestoringRoute,
  installAngularHmrRouteCaptureHook,
  invokeAngularHmrRouteCapture,
  isAngularHmrRestoringRoute,
  NativeScriptAngularHmrRouteReplay,
  NativeScriptAngularHmrRouteTracker,
  normalizeAngularHmrRouteUrl,
  readAngularHmrCurrentRoute,
  readAngularHmrPendingForwardNavigations,
  readAngularHmrPendingStartPath,
  resetAngularHmrRouteState,
  writeAngularHmrRouteState,
} from './hmr-route';

interface RouterEvent {
  url?: string;
}

interface RouterMock {
  events: Subject<RouterEvent>;
  url: string;
  navigateByUrl: jest.Mock<Promise<boolean>, [string]>;
  emitNavigationEnd(url: string): void;
  emitNavigationCancel(url: string): void;
}

function createRouterMock(initialUrl = '/'): RouterMock {
  const events = new Subject<RouterEvent>();
  return {
    events,
    url: initialUrl,
    navigateByUrl: jest.fn<Promise<boolean>, [string]>(() => Promise.resolve(true)),
    emitNavigationEnd(url) {
      this.url = url;
      events.next(new MockNavigationEnd(1, url, url) as unknown as RouterEvent);
    },
    emitNavigationCancel(url) {
      events.next(new MockNavigationCancel(1, url, 'cancel') as unknown as RouterEvent);
    },
  };
}

async function flushMicrotasks(rounds = 10): Promise<void> {
  for (let i = 0; i < rounds; i++) {
    await Promise.resolve();
  }
}

describe('Angular HMR route state', () => {
  afterEach(() => {
    resetAngularHmrRouteState();
  });

  it('normalizes route-like values to app paths', () => {
    expect(normalizeAngularHmrRouteUrl('/talk/library')).toBe('/talk/library');
    expect(normalizeAngularHmrRouteUrl('talk/library')).toBe('/talk/library');
    expect(normalizeAngularHmrRouteUrl('?tab=list')).toBe('/?tab=list');
    expect(normalizeAngularHmrRouteUrl('')).toBeNull();
  });

  it('returns the pending start path and opens the restoring window', () => {
    captureAngularHmrPendingStartPath('chatbot/42?mode=create');
    expect(readAngularHmrPendingStartPath()).toBe('/chatbot/42?mode=create');
    expect(isAngularHmrRestoringRoute()).toBe(true);
    expect(getAngularHmrRestoringRoute()).toBe('/chatbot/42?mode=create');
    expect(readAngularHmrPendingForwardNavigations()).toEqual([]);
  });

  it('uses the capture hook before falling back to the last current URL', () => {
    const dispose = installAngularHmrRouteCaptureHook(() => captureAngularHmrPendingStartPath('/talk/library?tab=saved'));
    try {
      expect(invokeAngularHmrRouteCapture()).toBe('/talk/library?tab=saved');
      expect(readAngularHmrPendingStartPath()).toBe('/talk/library?tab=saved');
    } finally {
      dispose();
    }
    writeAngularHmrRouteState('/profile?tab=goals', { source: 'navigation-end' });
    expect(invokeAngularHmrRouteCapture()).toBe('/profile?tab=goals');
  });

  it('boots named-outlet URLs at / and defers one forward navigation', () => {
    captureAngularHmrPendingStartPath('/talk/(todayTab:today)');
    expect(readAngularHmrPendingStartPath()).toBe('/');
    expect(readAngularHmrPendingForwardNavigations()).toEqual(['/talk/(todayTab:today)']);
    expect(isAngularHmrRestoringRoute()).toBe(true);
    expect(getAngularHmrRestoringRoute()).toBe('/talk/(todayTab:today)');
  });

  it('does not open the restoring window when nothing is pending', () => {
    expect(readAngularHmrPendingStartPath()).toBe('');
    expect(isAngularHmrRestoringRoute()).toBe(false);
  });

  it('opens and closes the restoring window on demand', () => {
    beginAngularHmrRouteRestore('/profile?tab=goals');
    expect(isAngularHmrRestoringRoute()).toBe(true);
    endAngularHmrRouteRestore();
    expect(isAngularHmrRestoringRoute()).toBe(false);
    expect(getAngularHmrRestoringRoute()).toBeNull();
  });
});

describe('cloneRoutesForBootstrap / route cache clear', () => {
  it('drops private Angular router cache fields while preserving public config', () => {
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

    const cloned = cloneRoutesForBootstrap<any>(routes);
    expect(cloned[0].loadComponent).toBe(loadComponent);
    expect(cloned[0].canActivate).not.toBe(canActivate);
    expect(cloned[0]._loadedComponent).toBeUndefined();
    expect(cloned[0]['ɵrouterPageId']).toBeUndefined();
    expect(cloned[0].children[0]._loadedComponent).toBeUndefined();
    expect(cloneRoutesForBootstrap(undefined)).toEqual([]);
  });

  it('clears lazy route caches recursively without looping on shared children', () => {
    const detailsInjectorDestroy = jest.fn();
    const grandchild = {
      path: 'details',
      _loadedComponent: { name: 'DetailsComponent' },
      _loadedInjector: { token: 'details', destroy: detailsInjectorDestroy },
    };
    const shared = {
      path: 'shared',
      _loadedComponent: { name: 'SharedComponent' },
    };
    const route = {
      path: 'onboarding-flow',
      children: [grandchild],
      _loadedRoutes: [shared],
    };
    const cleared = clearAngularHmrRouteConfigCaches([route, { path: 'b', _loadedRoutes: [shared] }]);
    expect(cleared).toBe(5);
    expect(detailsInjectorDestroy).toHaveBeenCalledTimes(1);
    expect((shared as any)._loadedComponent).toBeUndefined();
  });
});

describe('NativeScriptAngularHmrRouteTracker', () => {
  afterEach(() => {
    resetAngularHmrRouteState();
  });

  it('does not treat bootstrap "/" as a pending restore URL', () => {
    const router = createRouterMock('/');
    const tracker = new NativeScriptAngularHmrRouteTracker(router as never);
    expect(readAngularHmrPendingStartPath()).toBe('');
    router.emitNavigationEnd('/talk/(todayTab:today)');
    expect(readAngularHmrCurrentRoute()).toBe('/talk/(todayTab:today)');
    tracker.ngOnDestroy();
  });

  it('writes the current URL on NavigationEnd and captures it for reboot', () => {
    const router = createRouterMock('/');
    const tracker = new NativeScriptAngularHmrRouteTracker(router as never);
    router.emitNavigationEnd('/signup-landing');
    router.emitNavigationEnd('/login');
    router.emitNavigationEnd('/talk/(todayTab:today)');
    expect(readAngularHmrCurrentRoute()).toBe('/talk/(todayTab:today)');

    const captureHook = (globalThis as { __NS_CAPTURE_ANGULAR_HMR_ROUTE__?: () => string | null }).__NS_CAPTURE_ANGULAR_HMR_ROUTE__;
    expect(captureHook?.()).toBe('/talk/(todayTab:today)');
    expect(readAngularHmrPendingStartPath()).toBe('/');
    expect(readAngularHmrPendingForwardNavigations()).toEqual(['/talk/(todayTab:today)']);
    tracker.ngOnDestroy();
  });
});

describe('NativeScriptAngularHmrRouteReplay', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    resetAngularHmrRouteState();
  });

  afterEach(() => {
    jest.clearAllTimers();
    jest.useRealTimers();
    resetAngularHmrRouteState();
  });

  it('keeps the restoring window open during the grace period after a named-outlet replay', async () => {
    captureAngularHmrPendingStartPath('/talk/(todayTab:today)');
    expect(readAngularHmrPendingStartPath()).toBe('/');
    const router = createRouterMock();
    const replay = new NativeScriptAngularHmrRouteReplay(router as any);
    router.emitNavigationEnd('/');
    await flushMicrotasks();
    await flushMicrotasks();
    expect(router.navigateByUrl).toHaveBeenCalledWith('/talk/(todayTab:today)');
    expect(isAngularHmrRestoringRoute()).toBe(true);
    jest.advanceTimersByTime(999);
    expect(isAngularHmrRestoringRoute()).toBe(true);
    jest.advanceTimersByTime(1);
    expect(isAngularHmrRestoringRoute()).toBe(false);
    replay.ngOnDestroy();
  });

  it('keeps the window open across the grace period when the deferred replay aborts', async () => {
    captureAngularHmrPendingStartPath('/talk/(todayTab:today)');
    readAngularHmrPendingStartPath();
    const router = createRouterMock();
    router.navigateByUrl.mockImplementation(() => Promise.resolve(false));
    const replay = new NativeScriptAngularHmrRouteReplay(router as any);
    router.emitNavigationEnd('/');
    await flushMicrotasks();
    await flushMicrotasks();
    await flushMicrotasks();
    expect(isAngularHmrRestoringRoute()).toBe(true);
    jest.advanceTimersByTime(1000);
    expect(isAngularHmrRestoringRoute()).toBe(false);
    replay.ngOnDestroy();
  });

  it('keeps a single-URL restore window open after the initial NavigationEnd', () => {
    beginAngularHmrRouteRestore('/profile?tab=goals');
    const router = createRouterMock();
    const replay = new NativeScriptAngularHmrRouteReplay(router as any);
    router.emitNavigationEnd('/profile?tab=goals');
    expect(isAngularHmrRestoringRoute()).toBe(true);
    jest.advanceTimersByTime(1000);
    expect(isAngularHmrRestoringRoute()).toBe(false);
    replay.ngOnDestroy();
  });

  it('clears the deferred close timer when the service is destroyed', async () => {
    captureAngularHmrPendingStartPath('/talk/(todayTab:today)');
    readAngularHmrPendingStartPath();
    const router = createRouterMock();
    const replay = new NativeScriptAngularHmrRouteReplay(router as any);
    router.emitNavigationEnd('/');
    await flushMicrotasks();
    await flushMicrotasks();
    replay.ngOnDestroy();
    expect(isAngularHmrRestoringRoute()).toBe(false);
    beginAngularHmrRouteRestore('/somewhere/else');
    jest.advanceTimersByTime(2000);
    expect(isAngularHmrRestoringRoute()).toBe(true);
    endAngularHmrRouteRestore();
  });

  it('closes the window immediately when the initial navigation fails', () => {
    captureAngularHmrPendingStartPath('/talk/(todayTab:today)');
    readAngularHmrPendingStartPath();
    const router = createRouterMock();
    const replay = new NativeScriptAngularHmrRouteReplay(router as any);
    router.emitNavigationCancel('/');
    expect(router.navigateByUrl).not.toHaveBeenCalled();
    expect(isAngularHmrRestoringRoute()).toBe(false);
    replay.ngOnDestroy();
  });
});
