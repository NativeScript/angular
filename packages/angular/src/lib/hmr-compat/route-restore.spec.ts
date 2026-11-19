import type { Router } from '@angular/router';
import {
  beginRouteRestoreBoot,
  createRouteParticipant,
  getAngularHmrRestoringRoute,
  isAngularHmrRestoringRoute,
  primaryOnlyUrl,
  resetRouteRestoreState,
  RouteParticipantDeps,
  RouteSnapshot,
} from './route-restore';

interface FakeGroup {
  children: Record<string, FakeGroup>;
}

// A URL is modelled by its outlet tree only; the serializer prints that tree.
const trees: Record<string, FakeGroup> = {
  '/home': { children: { primary: { children: {} } } },
  '/details/1': { children: { primary: { children: {} } } },
  '/home(modal:details)': { children: { primary: { children: {} }, modal: { children: {} } } },
  '/tabs/(home:a//search:b)': {
    children: { primary: { children: { home: { children: {} }, search: { children: {} } } } },
  },
};

function serialize(group: FakeGroup): string {
  return Object.entries(group.children)
    .map(([outlet, child]) => `${outlet}[${serialize(child)}]`)
    .join(',');
}

function fakeRouter(url: string, config: unknown[] = []) {
  const router = {
    url,
    config,
    parseUrl: (u: string) => ({ root: JSON.parse(JSON.stringify(trees[u])) as FakeGroup }),
    serializeUrl: (tree: { root: FakeGroup }) => `serialized:${serialize(tree.root)}`,
    navigateByUrl: jest.fn(async (target: string) => {
      router.url = target;
      return true;
    }),
  };
  return router;
}

function participantFor(router: ReturnType<typeof fakeRouter>, overrides: Partial<RouteParticipantDeps> = {}) {
  const deps: RouteParticipantDeps = {
    router: router as unknown as RouteParticipantDeps['router'],
    clearRouteReuseCache: jest.fn(),
    whenNavigationSettled: () => Promise.resolve(),
    log: jest.fn(),
    ...overrides,
  };
  return { participant: createRouteParticipant(deps), deps };
}

describe('route restore', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    resetRouteRestoreState();
  });
  afterEach(() => {
    resetRouteRestoreState();
    jest.useRealTimers();
  });

  it('strips named outlets at every depth for the boot URL', () => {
    const router = fakeRouter('/');
    const parser = router as unknown as Pick<Router, 'parseUrl' | 'serializeUrl'>;
    expect(primaryOnlyUrl(parser, '/home')).toBe('/home');
    expect(primaryOnlyUrl(parser, '/home(modal:details)')).toBe('serialized:primary[]');
    expect(primaryOnlyUrl(parser, '/tabs/(home:a//search:b)')).toBe('serialized:primary[]');
    expect(primaryOnlyUrl(parser, '/unparseable')).toBe('/');
  });

  it('saves the URL, clears the router caches and flags the restore', () => {
    const route: Record<string, unknown> = { path: 'home', _loadedComponent: class {} };
    const router = fakeRouter('/home', [route]);
    const { participant, deps } = participantFor(router);
    expect(isAngularHmrRestoringRoute()).toBe(false);

    const snapshot = participant.save() as RouteSnapshot;

    expect(snapshot).toEqual({ url: '/home', bootUrl: '/home' });
    expect(deps.clearRouteReuseCache).toHaveBeenCalledTimes(1);
    expect('_loadedComponent' in route).toBe(false);
    expect(getAngularHmrRestoringRoute()).toBe('/home');
  });

  it('boots the next app at the saved URL until a restore completes', async () => {
    const { participant } = participantFor(fakeRouter('/details/1'));
    const snapshot = participant.save();
    expect(beginRouteRestoreBoot()).toBe('/details/1');
    // A failed bootstrap is retried at the same URL.
    expect(beginRouteRestoreBoot()).toBe('/details/1');

    const next = fakeRouter('/details/1');
    await participantFor(next).participant.restore(snapshot);

    expect(next.navigateByUrl).not.toHaveBeenCalled();
    expect(beginRouteRestoreBoot()).toBeUndefined();
    expect(isAngularHmrRestoringRoute()).toBe(true);
    jest.advanceTimersByTime(1000);
    expect(isAngularHmrRestoringRoute()).toBe(false);
  });

  it('navigates after boot, without animation, to a URL the start path could not reach', async () => {
    const { participant } = participantFor(fakeRouter('/home(modal:details)'));
    const snapshot = participant.save() as RouteSnapshot;
    expect(snapshot.bootUrl).toBe('serialized:primary[]');

    const next = fakeRouter('/home');
    const settled = jest.fn(() => Promise.resolve());
    await participantFor(next, { whenNavigationSettled: settled }).participant.restore(snapshot);

    expect(settled).toHaveBeenCalled();
    expect(next.navigateByUrl).toHaveBeenCalledWith('/home(modal:details)', { animated: false });
  });

  it('keeps the restore target when the app reboots again mid-restore', () => {
    const { participant } = participantFor(fakeRouter('/details/1'));
    participant.save();
    const interim = participantFor(fakeRouter('/'));
    expect(interim.participant.save()).toEqual({ url: '/details/1', bootUrl: '/details/1' });
  });

  it('logs and skips an invalid snapshot or a failed navigation', async () => {
    const next = fakeRouter('/home');
    next.navigateByUrl.mockRejectedValueOnce(new Error('no route'));
    const { participant, deps } = participantFor(next);
    await participant.restore({ url: 1 });
    await participant.restore({ url: '/gone', bootUrl: '/gone' });
    expect(deps.log).toHaveBeenCalledTimes(3);
  });

  it('drops the flag when the rebooted app never restores', () => {
    participantFor(fakeRouter('/home')).participant.save();
    beginRouteRestoreBoot();
    jest.advanceTimersByTime(10000);
    expect(isAngularHmrRestoringRoute()).toBe(false);
  });
});
