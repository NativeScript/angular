jest.mock('@angular/core', () => ({
  Injectable: () => (target: unknown) => target,
}));

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

jest.mock('../../hmr-environment', () => ({
  isAngularHmrEnabled: () => true,
}));

import { Subject } from 'rxjs';

import {
  beginAngularHmrRouteRestore,
  clearAngularHmrPendingRouteHistory,
  clearAngularHmrRouteHistory,
  endAngularHmrRouteRestore,
  isAngularHmrRestoringRoute,
  pushAngularHmrRouteHistoryEntry,
  readAngularHmrPendingForwardNavigations,
  readAngularHmrPendingRouteHistory,
  readAngularHmrPendingStartPath,
  snapshotAngularHmrRouteHistory,
} from './hmr-route-state-core';
import { NativeScriptAngularHmrRouteReplay } from './hmr-route-replay';

interface RouterEvent {
  url?: string;
}

interface RouterMock {
  events: Subject<RouterEvent>;
  navigateByUrl: jest.Mock<Promise<boolean>, [string]>;
  emitNavigationEnd(url: string): void;
  emitNavigationCancel(url: string): void;
  emitNavigationError(url: string): void;
}

function createRouterMock(): RouterMock {
  const events = new Subject<RouterEvent>();
  const navigateByUrl = jest.fn<Promise<boolean>, [string]>(() => Promise.resolve(true));
  return {
    events,
    navigateByUrl,
    emitNavigationEnd(url: string) {
      events.next(new MockNavigationEnd(1, url, url) as unknown as RouterEvent);
    },
    emitNavigationCancel(url: string) {
      events.next(new MockNavigationCancel(1, url, 'cancel') as unknown as RouterEvent);
    },
    emitNavigationError(url: string) {
      events.next(new MockNavigationError(1, url, new Error('boom')) as unknown as RouterEvent);
    },
  };
}

/**
 * Drain the microtask queue so awaited statements inside
 * `replayForwardNavigations` make progress. Jest's modern fake timers
 * fake `setImmediate` and `process.nextTick` but leave the JS engine's
 * Promise microtask queue alone, so chaining `await Promise.resolve()`
 * is the simplest way to push the replay through one `await` boundary
 * at a time.
 */
async function flushMicrotasks(rounds = 10): Promise<void> {
  for (let i = 0; i < rounds; i++) {
    await Promise.resolve();
  }
}

describe('NativeScriptAngularHmrRouteReplay', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    clearAngularHmrRouteHistory();
    clearAngularHmrPendingRouteHistory();
    endAngularHmrRouteRestore();
  });

  afterEach(() => {
    jest.clearAllTimers();
    jest.useRealTimers();
    clearAngularHmrRouteHistory();
    clearAngularHmrPendingRouteHistory();
    endAngularHmrRouteRestore();
  });

  it('keeps the restoring window open during the grace period after the deferred named-outlet replay completes', async () => {
    // Latest URL has named outlets → start-path resolver falls back to '/'
    // and emits a single forward navigation. No back-stack walk.
    pushAngularHmrRouteHistoryEntry('/profile');
    pushAngularHmrRouteHistoryEntry('/talk/(todayTab:today)');
    snapshotAngularHmrRouteHistory();

    expect(readAngularHmrPendingStartPath()).toBe('/');
    expect(readAngularHmrPendingForwardNavigations()).toEqual(['/talk/(todayTab:today)']);
    expect(isAngularHmrRestoringRoute()).toBe(true);

    const router = createRouterMock();
    const replay = new NativeScriptAngularHmrRouteReplay(router as any);

    router.emitNavigationEnd('/');

    await flushMicrotasks();
    await flushMicrotasks();

    expect(router.navigateByUrl).toHaveBeenCalledWith('/talk/(todayTab:today)');
    expect(readAngularHmrPendingRouteHistory()).toEqual([]);
    // The replay finished but the grace period should still consider the
    // window open so async (loaded) handlers can suppress default
    // navigations.
    expect(isAngularHmrRestoringRoute()).toBe(true);

    jest.advanceTimersByTime(999);
    expect(isAngularHmrRestoringRoute()).toBe(true);

    jest.advanceTimersByTime(1);
    expect(isAngularHmrRestoringRoute()).toBe(false);

    replay.ngOnDestroy();
  });

  it('keeps the window open across the grace period when the deferred named-outlet replay aborts', async () => {
    pushAngularHmrRouteHistoryEntry('/profile');
    pushAngularHmrRouteHistoryEntry('/profile/edit');
    pushAngularHmrRouteHistoryEntry('/talk/(todayTab:today)');
    snapshotAngularHmrRouteHistory();

    // Only the latest URL (with named outlets) is deferred to the forward
    // walk. Intermediate URLs are NOT re-navigated to under the clean-DX
    // policy (NS Frames own the page stack, not the URL serializer).
    expect(readAngularHmrPendingStartPath()).toBe('/');
    expect(readAngularHmrPendingForwardNavigations()).toEqual(['/talk/(todayTab:today)']);
    expect(isAngularHmrRestoringRoute()).toBe(true);

    const router = createRouterMock();
    // Simulate the single forward navigation rejecting (e.g. route guard).
    router.navigateByUrl.mockImplementation(() => Promise.resolve(false));

    const replay = new NativeScriptAngularHmrRouteReplay(router as any);
    router.emitNavigationEnd('/');

    await flushMicrotasks();
    await flushMicrotasks();
    await flushMicrotasks();

    expect(router.navigateByUrl).toHaveBeenCalledWith('/talk/(todayTab:today)');
    expect(readAngularHmrPendingRouteHistory()).toEqual([]);
    // Even when aborted, the grace period should still hold the window
    // open so user-app guards see `true` until the deferred close fires.
    expect(isAngularHmrRestoringRoute()).toBe(true);

    jest.advanceTimersByTime(1000);
    expect(isAngularHmrRestoringRoute()).toBe(false);

    replay.ngOnDestroy();
  });

  it('keeps the single-URL restore window open across the grace period after the initial NavigationEnd', () => {
    beginAngularHmrRouteRestore('/profile?tab=goals');
    expect(isAngularHmrRestoringRoute()).toBe(true);

    const router = createRouterMock();
    const replay = new NativeScriptAngularHmrRouteReplay(router as any);

    router.emitNavigationEnd('/profile?tab=goals');

    expect(isAngularHmrRestoringRoute()).toBe(true);

    jest.advanceTimersByTime(999);
    expect(isAngularHmrRestoringRoute()).toBe(true);

    jest.advanceTimersByTime(1);
    expect(isAngularHmrRestoringRoute()).toBe(false);

    replay.ngOnDestroy();
  });

  it('clears the deferred close timer when the service is destroyed', async () => {
    // Latest URL has named outlets → start-path resolver falls back to '/'
    // and emits a single forward navigation.
    pushAngularHmrRouteHistoryEntry('/profile');
    pushAngularHmrRouteHistoryEntry('/talk/(todayTab:today)');
    snapshotAngularHmrRouteHistory();

    expect(readAngularHmrPendingStartPath()).toBe('/');
    expect(isAngularHmrRestoringRoute()).toBe(true);

    const router = createRouterMock();
    const replay = new NativeScriptAngularHmrRouteReplay(router as any);

    router.emitNavigationEnd('/');
    await flushMicrotasks();
    await flushMicrotasks();

    expect(isAngularHmrRestoringRoute()).toBe(true);

    replay.ngOnDestroy();

    expect(isAngularHmrRestoringRoute()).toBe(false);

    // Make sure the deferred timer cannot fire later and toggle the
    // window for a future bootstrap that has its own snapshot.
    beginAngularHmrRouteRestore('/somewhere/else');
    jest.advanceTimersByTime(2000);
    expect(isAngularHmrRestoringRoute()).toBe(true);

    endAngularHmrRouteRestore();
  });

  it('closes the window immediately when the initial navigation fails (no grace period)', () => {
    pushAngularHmrRouteHistoryEntry('/profile');
    pushAngularHmrRouteHistoryEntry('/talk/(todayTab:today)');
    snapshotAngularHmrRouteHistory();

    const router = createRouterMock();
    const replay = new NativeScriptAngularHmrRouteReplay(router as any);

    router.emitNavigationCancel('/');

    expect(router.navigateByUrl).not.toHaveBeenCalled();
    expect(readAngularHmrPendingRouteHistory()).toEqual([]);
    // When the initial navigation never settles successfully there is no
    // restored route to protect; we close the window straight away.
    expect(isAngularHmrRestoringRoute()).toBe(false);

    replay.ngOnDestroy();
  });
});
