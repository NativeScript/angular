import {
  beginAngularHmrRouteRestore,
  captureAngularHmrPendingStartPath,
  clearAngularHmrPendingRouteHistory,
  clearAngularHmrRouteHistory,
  endAngularHmrRouteRestore,
  getAngularHmrRestoringRoute,
  invokeAngularHmrRouteCapture,
  installAngularHmrRouteCaptureHook,
  isAngularHmrRestoringRoute,
  normalizeAngularHmrRouteUrl,
  popAngularHmrRouteHistoryEntry,
  pushAngularHmrRouteHistoryEntry,
  readAngularHmrPendingForwardNavigations,
  readAngularHmrPendingRouteHistory,
  readAngularHmrPendingStartPath,
  readAngularHmrRouteHistory,
  replaceAngularHmrRouteHistoryTop,
  resetAngularHmrRouteHistoryToUrl,
  snapshotAngularHmrRouteHistory,
  writeAngularHmrRouteState,
} from './hmr-route-state-core';

describe('Angular HMR route state', () => {
  const g = globalThis as any;

  afterEach(() => {
    delete g.__NS_ANGULAR_HMR_CURRENT_ROUTE__;
    delete g.__NS_ANGULAR_HMR_PENDING_START_PATH__;
    delete g.__NS_CAPTURE_ANGULAR_HMR_ROUTE__;
    clearAngularHmrRouteHistory();
    clearAngularHmrPendingRouteHistory();
    endAngularHmrRouteRestore();
  });

  it('normalizes route-like values to app paths', () => {
    expect(normalizeAngularHmrRouteUrl('/talk/library')).toBe('/talk/library');
    expect(normalizeAngularHmrRouteUrl('talk/library')).toBe('/talk/library');
    expect(normalizeAngularHmrRouteUrl('?tab=list')).toBe('/?tab=list');
    expect(normalizeAngularHmrRouteUrl('')).toBeNull();
  });

  it('returns the pending HMR start path from a captured snapshot', () => {
    captureAngularHmrPendingStartPath('chatbot/42?mode=create');

    expect(readAngularHmrPendingStartPath()).toBe('/chatbot/42?mode=create');
    expect(g.__NS_ANGULAR_HMR_PENDING_START_PATH__).toMatchObject({
      url: '/chatbot/42?mode=create',
      source: 'hmr-reboot',
    });
  });

  it('uses the installed capture hook before falling back to the last route snapshot', () => {
    const dispose = installAngularHmrRouteCaptureHook(() => captureAngularHmrPendingStartPath('/talk/library?tab=saved'));

    try {
      expect(invokeAngularHmrRouteCapture()).toBe('/talk/library?tab=saved');
      expect(readAngularHmrPendingStartPath()).toBe('/talk/library?tab=saved');
    } finally {
      dispose();
    }

    expect(g.__NS_CAPTURE_ANGULAR_HMR_ROUTE__).toBeUndefined();
  });

  it('falls back to the last known route when no capture hook is installed', () => {
    writeAngularHmrRouteState('/profile?tab=goals', { source: 'navigation-end' });

    expect(invokeAngularHmrRouteCapture()).toBe('/profile?tab=goals');
    expect(readAngularHmrPendingStartPath()).toBe('/profile?tab=goals');
  });

  describe('back-stack history mirror', () => {
    it('pushes URLs onto the live mirror and reads them back in order', () => {
      pushAngularHmrRouteHistoryEntry('/talk/(todayTab:today)');
      pushAngularHmrRouteHistoryEntry('/profile');

      expect(readAngularHmrRouteHistory()).toEqual(['/talk/(todayTab:today)', '/profile']);
    });

    it('collapses repeated pushes of the same top entry so canonical redirects do not inflate the stack', () => {
      pushAngularHmrRouteHistoryEntry('/profile');
      pushAngularHmrRouteHistoryEntry('/profile');
      pushAngularHmrRouteHistoryEntry('/profile');

      expect(readAngularHmrRouteHistory()).toEqual(['/profile']);
    });

    it('pops the top entry on back-style navigations', () => {
      pushAngularHmrRouteHistoryEntry('/talk/(todayTab:today)');
      pushAngularHmrRouteHistoryEntry('/profile');

      expect(popAngularHmrRouteHistoryEntry()).toBe('/profile');
      expect(readAngularHmrRouteHistory()).toEqual(['/talk/(todayTab:today)']);
    });

    it('replaces the top entry when NavigationEnd reports a replaceUrl navigation', () => {
      pushAngularHmrRouteHistoryEntry('/talk/(todayTab:today)');
      pushAngularHmrRouteHistoryEntry('/profile');
      replaceAngularHmrRouteHistoryTop('/profile?tab=goals');

      expect(readAngularHmrRouteHistory()).toEqual(['/talk/(todayTab:today)', '/profile?tab=goals']);
    });

    it('collapses the live mirror to a single URL on a clearHistory navigation', () => {
      // Mirrors NativeScript's `clearHistory: true` extra: the user-visible
      // back-stack is reset to just the destination, so the HMR mirror
      // must follow suit.
      pushAngularHmrRouteHistoryEntry('/');
      pushAngularHmrRouteHistoryEntry('/signup-landing');
      pushAngularHmrRouteHistoryEntry('/login');

      expect(resetAngularHmrRouteHistoryToUrl('/talk/(todayTab:today)')).toBe('/talk/(todayTab:today)');
      expect(readAngularHmrRouteHistory()).toEqual(['/talk/(todayTab:today)']);
    });

    it('clears the live mirror entirely when reset is called with an unparseable URL', () => {
      pushAngularHmrRouteHistoryEntry('/talk/(todayTab:today)');
      pushAngularHmrRouteHistoryEntry('/profile');

      expect(resetAngularHmrRouteHistoryToUrl(undefined)).toBeNull();
      expect(readAngularHmrRouteHistory()).toEqual([]);
    });

    it('snapshots the live mirror into the pending slot for the next bootstrap', () => {
      pushAngularHmrRouteHistoryEntry('/talk/(todayTab:today)');
      pushAngularHmrRouteHistoryEntry('/profile');

      expect(snapshotAngularHmrRouteHistory()).toEqual(['/talk/(todayTab:today)', '/profile']);
      expect(readAngularHmrPendingRouteHistory()).toEqual(['/talk/(todayTab:today)', '/profile']);
    });

    it('clears the live mirror after snapshotting so the next bootstrap starts fresh', () => {
      pushAngularHmrRouteHistoryEntry('/talk/(todayTab:today)');
      pushAngularHmrRouteHistoryEntry('/profile');

      snapshotAngularHmrRouteHistory();

      // The live mirror is reset so the new bootstrap's tracker rebuilds it
      // from the replay's NavigationEnd events; without this the live mirror
      // would accumulate across HMR cycles and grow snapshots without bound.
      expect(readAngularHmrRouteHistory()).toEqual([]);
      // Pending snapshot is preserved for the new bootstrap to consume.
      expect(readAngularHmrPendingRouteHistory()).toEqual(['/talk/(todayTab:today)', '/profile']);
    });

    it('does not let pushes after snapshot reach the pending slot', () => {
      pushAngularHmrRouteHistoryEntry('/talk/(todayTab:today)');
      pushAngularHmrRouteHistoryEntry('/profile');
      snapshotAngularHmrRouteHistory();

      // Simulate the new bootstrap's tracker subscribing to NavigationEnd
      // events and pushing as the replay walks forward.
      pushAngularHmrRouteHistoryEntry('/talk/(todayTab:today)');
      pushAngularHmrRouteHistoryEntry('/profile');

      expect(readAngularHmrRouteHistory()).toEqual(['/talk/(todayTab:today)', '/profile']);
      // Pending is still the original snapshot; the new tracker's pushes
      // do not retroactively contaminate it.
      expect(readAngularHmrPendingRouteHistory()).toEqual(['/talk/(todayTab:today)', '/profile']);
    });

    it('keeps the live mirror untouched when the snapshot is a no-op', () => {
      // Empty live mirror: snapshot returns [] and must not clobber any
      // earlier pending snapshot the previous HMR cycle wrote.
      pushAngularHmrRouteHistoryEntry('/profile');
      snapshotAngularHmrRouteHistory();
      // After consuming a snapshot, mock the boundary where the previous
      // pending snapshot is still recorded but the live mirror is empty.
      expect(snapshotAngularHmrRouteHistory()).toEqual([]);
      expect(readAngularHmrPendingRouteHistory()).toEqual(['/profile']);
      expect(readAngularHmrRouteHistory()).toEqual([]);
    });

    it('returns no forward navigations when the latest URL has no named outlets (clean DX policy)', () => {
      // HMR DX policy: restore only the user's current URL. Walking captured
      // back-stack URLs creates visible mid-save re-navigation sequences that
      // the user has to sit through, AND it never reconstructs the Frame back
      // stack (NS Frames own the page stack, not the URL serializer). Forward
      // is empty when the start path itself IS the user's current URL.
      pushAngularHmrRouteHistoryEntry('/talk/(todayTab:today)');
      pushAngularHmrRouteHistoryEntry('/profile');
      pushAngularHmrRouteHistoryEntry('/profile/edit');
      snapshotAngularHmrRouteHistory();

      expect(readAngularHmrPendingForwardNavigations()).toEqual([]);
    });

    it('returns the deferred named-outlet URL as the single forward navigation when the latest URL has named outlets', () => {
      // Named-outlet URLs can't be served as the initial-navigation path
      // (outlet directives live in lazy child templates that don't exist
      // yet at `router.initialNavigation()` time). Start path falls back
      // to '/' and a single forward navigation lands the user back on the
      // captured deep URL after the primary outlet has registered the
      // named outlets.
      pushAngularHmrRouteHistoryEntry('/profile');
      pushAngularHmrRouteHistoryEntry('/talk/(todayTab:today)');
      snapshotAngularHmrRouteHistory();

      expect(readAngularHmrPendingStartPath()).toBe('/');
      expect(readAngularHmrPendingForwardNavigations()).toEqual(['/talk/(todayTab:today)']);
    });

    it('returns an empty forward list when the snapshot has only the bottom of the stack', () => {
      pushAngularHmrRouteHistoryEntry('/profile');
      snapshotAngularHmrRouteHistory();

      expect(readAngularHmrPendingForwardNavigations()).toEqual([]);
    });

    it('uses the TOP of the snapshot as the pending start path so the router lands directly on the user current URL', () => {
      pushAngularHmrRouteHistoryEntry('/talk/(todayTab:today)');
      pushAngularHmrRouteHistoryEntry('/profile');
      snapshotAngularHmrRouteHistory();

      // Latest captured URL is '/profile' (no named outlets) → that's the
      // direct start path. No walk through intermediate '/talk/...'.
      expect(readAngularHmrPendingStartPath()).toBe('/profile');
    });

    it('falls back to the legacy single-URL slot when no snapshot is present', () => {
      captureAngularHmrPendingStartPath('/profile?tab=goals');

      expect(readAngularHmrPendingStartPath()).toBe('/profile?tab=goals');
      expect(readAngularHmrPendingForwardNavigations()).toEqual([]);
    });

    it('clears the pending snapshot once the replay has finished', () => {
      pushAngularHmrRouteHistoryEntry('/talk/(todayTab:today)');
      pushAngularHmrRouteHistoryEntry('/profile');
      snapshotAngularHmrRouteHistory();
      clearAngularHmrPendingRouteHistory();

      expect(readAngularHmrPendingRouteHistory()).toEqual([]);
      expect(readAngularHmrPendingForwardNavigations()).toEqual([]);
    });
  });

  describe('route restoration window', () => {
    it('reports no restoration in progress by default', () => {
      expect(isAngularHmrRestoringRoute()).toBe(false);
      expect(getAngularHmrRestoringRoute()).toBeNull();
    });

    it('opens the window for the requested target URL and closes it on demand', () => {
      beginAngularHmrRouteRestore('/profile?tab=goals');

      expect(isAngularHmrRestoringRoute()).toBe(true);
      expect(getAngularHmrRestoringRoute()).toBe('/profile?tab=goals');

      endAngularHmrRouteRestore();

      expect(isAngularHmrRestoringRoute()).toBe(false);
      expect(getAngularHmrRestoringRoute()).toBeNull();
    });

    it('opens the window when the pending route history snapshot resolves a deep route', () => {
      // Clean-DX policy: start path is the user's CURRENT URL (top of stack),
      // not the bottom. The restoration window opens against the same URL
      // since that's where we're heading.
      pushAngularHmrRouteHistoryEntry('/talk/(todayTab:today)');
      pushAngularHmrRouteHistoryEntry('/profile');
      snapshotAngularHmrRouteHistory();

      expect(readAngularHmrPendingStartPath()).toBe('/profile');
      expect(isAngularHmrRestoringRoute()).toBe(true);
      expect(getAngularHmrRestoringRoute()).toBe('/profile');
    });

    it('opens the window when only the legacy single-URL fallback is available', () => {
      captureAngularHmrPendingStartPath('/profile?tab=goals');

      expect(readAngularHmrPendingStartPath()).toBe('/profile?tab=goals');
      expect(isAngularHmrRestoringRoute()).toBe(true);
      expect(getAngularHmrRestoringRoute()).toBe('/profile?tab=goals');
    });

    it('does not open the window when there is no pending HMR start path', () => {
      expect(readAngularHmrPendingStartPath()).toBe('');
      expect(isAngularHmrRestoringRoute()).toBe(false);
    });

    it('coerces non-string targets and discards empty values', () => {
      beginAngularHmrRouteRestore(undefined as unknown as string);

      expect(isAngularHmrRestoringRoute()).toBe(true);
      expect(getAngularHmrRestoringRoute()).toBeNull();
    });
  });
});