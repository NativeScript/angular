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

jest.mock('@angular/router', () => ({
  NavigationStart: MockNavigationStart,
  NavigationEnd: MockNavigationEnd,
  Router: class {},
}));

jest.mock('../../hmr-environment', () => ({
  isAngularHmrEnabled: () => true,
}));

import { Subject } from 'rxjs';

import {
  clearAngularHmrPendingRouteHistory,
  clearAngularHmrRouteHistory,
  endAngularHmrRouteRestore,
  readAngularHmrPendingRouteHistory,
  readAngularHmrRouteHistory,
} from './hmr-route-state-core';
import { NativeScriptAngularHmrRouteTracker } from './hmr-route-state';

interface RouterEvent {
  url?: string;
}

interface RouterMock {
  events: Subject<RouterEvent>;
  url: string;
  emitNavigationEnd(url: string): void;
  emitNavigationStart(
    url: string,
    options?: {
      trigger?: 'imperative' | 'popstate' | 'hashchange';
      restoredState?: { navigationId: number } | null;
    },
  ): void;
}

function createRouterMock(initialUrl: string): RouterMock {
  const events = new Subject<RouterEvent>();
  return {
    events,
    url: initialUrl,
    emitNavigationStart(url, options) {
      events.next(
        new MockNavigationStart(
          1,
          url,
          options?.trigger ?? 'imperative',
          options?.restoredState ?? null,
        ) as unknown as RouterEvent,
      );
    },
    emitNavigationEnd(url) {
      this.url = url;
      events.next(new MockNavigationEnd(1, url, url) as unknown as RouterEvent);
    },
  };
}

describe('NativeScriptAngularHmrRouteTracker', () => {
  beforeEach(() => {
    clearAngularHmrRouteHistory();
    clearAngularHmrPendingRouteHistory();
    endAngularHmrRouteRestore();
  });

  afterEach(() => {
    clearAngularHmrRouteHistory();
    clearAngularHmrPendingRouteHistory();
    endAngularHmrRouteRestore();
  });

  describe('bootstrap seed', () => {
    it('does not seed the live mirror when the router is still at the root URL', () => {
      const router = createRouterMock('/');

      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const tracker = new NativeScriptAngularHmrRouteTracker(router as never);

      // The router has not run its initial navigation at ENVIRONMENT_INITIALIZER
      // time so its url is "/". Pushing that here would put a noise entry at
      // the bottom of the next snapshot — which becomes the next bootstrap's
      // START_PATH and triggers a redirect → extra NavigationEnd → re-entry
      // into the replay path. Skipping the seed avoids that whole loop; the
      // first real NavigationEnd below seeds the mirror with the actual URL.
      expect(readAngularHmrRouteHistory()).toEqual([]);

      router.emitNavigationStart('/talk/(todayTab:today)');
      router.emitNavigationEnd('/talk/(todayTab:today)');

      expect(readAngularHmrRouteHistory()).toEqual(['/talk/(todayTab:today)']);
    });

    it('does not seed the live mirror when the router url is empty', () => {
      const router = createRouterMock('');

      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const tracker = new NativeScriptAngularHmrRouteTracker(router as never);

      expect(readAngularHmrRouteHistory()).toEqual([]);
    });

    it('still seeds the live mirror when the bootstrap router already sits at a real route', () => {
      // Some tests / boot paths instantiate the tracker after the router has
      // already settled on the initial route (e.g. with router state restored
      // from disk). In that case the url is already meaningful and dropping
      // it would lose the only entry we have until the next NavigationEnd.
      const router = createRouterMock('/talk/(todayTab:today)');

      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const tracker = new NativeScriptAngularHmrRouteTracker(router as never);

      expect(readAngularHmrRouteHistory()).toEqual(['/talk/(todayTab:today)']);
    });
  });

  describe('NavigationEnd integration', () => {
    it('rebuilds the live mirror from a sequence of forward navigations', () => {
      const router = createRouterMock('/');

      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const tracker = new NativeScriptAngularHmrRouteTracker(router as never);

      router.emitNavigationStart('/talk/(todayTab:today)');
      router.emitNavigationEnd('/talk/(todayTab:today)');
      router.emitNavigationStart('/profile');
      router.emitNavigationEnd('/profile');

      expect(readAngularHmrRouteHistory()).toEqual(['/talk/(todayTab:today)', '/profile']);
    });

    it('pops the live mirror on popstate-triggered NavigationEnd events', () => {
      const router = createRouterMock('/');

      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const tracker = new NativeScriptAngularHmrRouteTracker(router as never);

      router.emitNavigationStart('/talk/(todayTab:today)');
      router.emitNavigationEnd('/talk/(todayTab:today)');
      router.emitNavigationStart('/profile');
      router.emitNavigationEnd('/profile');
      router.emitNavigationStart('/talk/(todayTab:today)', {
        trigger: 'popstate',
        restoredState: { navigationId: 1 },
      });
      router.emitNavigationEnd('/talk/(todayTab:today)');

      expect(readAngularHmrRouteHistory()).toEqual(['/talk/(todayTab:today)']);
    });
  });

  describe('clear-after-snapshot integration', () => {
    it('a snapshot during HMR reboot leaves the live mirror empty for the next bootstrap to rebuild', () => {
      // Cycle 1: real boot, walk forward to /profile.
      const cycle1 = createRouterMock('/');
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const tracker1 = new NativeScriptAngularHmrRouteTracker(cycle1 as never);
      cycle1.emitNavigationStart('/talk/(todayTab:today)');
      cycle1.emitNavigationEnd('/talk/(todayTab:today)');
      cycle1.emitNavigationStart('/profile');
      cycle1.emitNavigationEnd('/profile');

      // HMR capture hook runs against the first tracker.
      const captureHook = (globalThis as { __NS_CAPTURE_ANGULAR_HMR_ROUTE__?: () => string | null })
        .__NS_CAPTURE_ANGULAR_HMR_ROUTE__;
      expect(captureHook).toBeDefined();
      captureHook?.();

      expect(readAngularHmrPendingRouteHistory()).toEqual(['/talk/(todayTab:today)', '/profile']);
      // Snapshot has cleared the live mirror so the cycle-2 tracker starts
      // with a clean slate. Without the clear, the next cycle's snapshot
      // would carry forward all prior entries and grow without bound.
      expect(readAngularHmrRouteHistory()).toEqual([]);
    });
  });
});
