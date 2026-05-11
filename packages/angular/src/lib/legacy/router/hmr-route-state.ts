import { Injectable, OnDestroy } from '@angular/core';
import { NavigationEnd, NavigationStart, Router } from '@angular/router';
import { Subscription } from 'rxjs';

import { isAngularHmrEnabled } from '../../hmr-environment';
import {
  installAngularHmrRouteCaptureHook,
  popAngularHmrRouteHistoryEntry,
  pushAngularHmrRouteHistoryEntry,
  readAngularHmrPendingStartPath,
  replaceAngularHmrRouteHistoryTop,
  resetAngularHmrRouteHistoryToUrl,
  snapshotAngularHmrRouteHistory,
  writeAngularHmrRouteState,
} from './hmr-route-state-core';

export {
  beginAngularHmrRouteRestore,
  captureAngularHmrPendingStartPath,
  clearAngularHmrPendingRouteHistory,
  clearAngularHmrRouteHistory,
  endAngularHmrRouteRestore,
  getAngularHmrRestoringRoute,
  invokeAngularHmrRouteCapture,
  isAngularHmrRestoringRoute,
  normalizeAngularHmrRouteUrl,
  popAngularHmrRouteHistoryEntry,
  pushAngularHmrRouteHistoryEntry,
  readAngularHmrPendingForwardNavigations,
  readAngularHmrPendingRouteHistory,
  readAngularHmrRouteHistory,
  replaceAngularHmrRouteHistoryTop,
  resetAngularHmrRouteHistoryToUrl,
  snapshotAngularHmrRouteHistory,
} from './hmr-route-state-core';
export { readAngularHmrPendingStartPath } from './hmr-route-state-core';

/**
 * Read NativeScript's `clearHistory: true` navigation extra off the active
 * Angular navigation. Defensive against test mocks and bare `Router`-like
 * shapes that don't expose `getCurrentNavigation` (e.g. earlier Angular
 * versions and the unit-test mocks in `hmr-route-state-tracker.spec.ts`).
 *
 * `clearHistory` is the NativeScript-only signal that
 * `NSLocationStrategy._beginPageNavigation` uses to collapse the native page
 * stack down to the destination. We mirror that on the HMR side so a
 * subsequent reboot doesn't replay URLs the user can no longer reach (the
 * canonical example: `/`, `/signup-landing`, `/login` after the auth flow
 * navigated to `/talk/(todayTab:today)` with `clearHistory: true`).
 */
function readClearHistoryFromRouter(router: Router): boolean {
  const getCurrentNavigation = (router as { getCurrentNavigation?: () => unknown }).getCurrentNavigation;
  if (typeof getCurrentNavigation !== 'function') {
    return false;
  }

  let navigation: unknown;
  try {
    navigation = getCurrentNavigation.call(router);
  } catch {
    return false;
  }

  const extras = (navigation as { extras?: { clearHistory?: unknown } } | null | undefined)?.extras;
  return !!extras?.clearHistory;
}

@Injectable()
export class NativeScriptAngularHmrRouteTracker implements OnDestroy {
  private subscription?: Subscription;
  private disposeCaptureHook?: () => void;
  // Tracks whether the current `NavigationStart..NavigationEnd` pair was kicked
  // off by a popstate (frame.goBack / NSLocationStrategy.back) so that on
  // `NavigationEnd` we can pop our mirror instead of pushing a duplicate entry.
  private currentNavigationIsPopstate = false;
  private currentNavigationReplaceUrl = false;
  // Tracks whether the active navigation was started with NativeScript's
  // `clearHistory: true` extra (read off `router.getCurrentNavigation()` at
  // `NavigationStart`). When set, the matching `NavigationEnd` collapses the
  // mirror down to just the destination URL — see
  // `resetAngularHmrRouteHistoryToUrl` for the rationale.
  private currentNavigationClearsHistory = false;

  constructor(private readonly router: Router) {
    if (!isAngularHmrEnabled()) {
      return;
    }

    this.disposeCaptureHook = this.installCaptureHook();
    this.captureCurrentRoute('bootstrap');
    this.subscription = this.router.events.subscribe((event) => {
      if (event instanceof NavigationStart) {
        this.currentNavigationIsPopstate = event.navigationTrigger === 'popstate';
        this.currentNavigationReplaceUrl = !!event.restoredState;
        this.currentNavigationClearsHistory = readClearHistoryFromRouter(this.router);
        return;
      }

      if (event instanceof NavigationEnd) {
        const url = event.urlAfterRedirects || event.url;
        writeAngularHmrRouteState(url, {
          source: 'navigation-end',
        });

        if (this.currentNavigationClearsHistory) {
          // NativeScript collapsed the native page stack to this single
          // destination. Mirror that on the HMR side so a future reboot
          // replays only what the user can still navigate back through —
          // not every URL they passed through before the reset.
          resetAngularHmrRouteHistoryToUrl(url);
        } else if (this.currentNavigationIsPopstate) {
          // The user (or NSLocationStrategy.back()) walked the back-stack down
          // by one page; mirror that by dropping the top of our snapshot so a
          // subsequent HMR reboot doesn't carry the popped page back into view.
          popAngularHmrRouteHistoryEntry();
        } else if (this.currentNavigationReplaceUrl) {
          replaceAngularHmrRouteHistoryTop(url);
        } else {
          pushAngularHmrRouteHistoryEntry(url);
        }

        this.currentNavigationIsPopstate = false;
        this.currentNavigationReplaceUrl = false;
        this.currentNavigationClearsHistory = false;
      }
    });
  }

  ngOnDestroy(): void {
    this.subscription?.unsubscribe();
    this.disposeCaptureHook?.();
  }

  private captureCurrentRoute(source: string): string | null {
    if (source === 'hmr-reboot') {
      // Snapshot the live mirror first so the bootstrap can replay forward
      // navigations to rebuild the back-stack. The pending single-URL slot
      // remains useful as a fallback when the snapshot turns out to be empty
      // (e.g. bootstrap-time HMR before the first NavigationEnd).
      snapshotAngularHmrRouteHistory();
    } else if (source === 'bootstrap') {
      // Seed the live mirror with the current URL so the very first HMR
      // before any user navigation still has a stack of size one to snapshot.
      //
      // Skip empty / root URLs: at ENVIRONMENT_INITIALIZER time the router
      // has not run its initial navigation yet so `router.url` is "/" (or
      // an empty string). Pushing that here would seed the mirror with a
      // noise entry that becomes the bottom of the next snapshot, which in
      // turn becomes the next bootstrap's `START_PATH`. The router then
      // boots to "/" → redirects to the real default route → fires an
      // extra `NavigationEnd` that re-enters the replay path. The first
      // genuine `NavigationEnd` arrives a moment later through the event
      // subscription below and seeds the mirror with the real URL, so
      // dropping the seed here is safe.
      const seedUrl = this.router.url;
      if (seedUrl && seedUrl !== '/') {
        pushAngularHmrRouteHistoryEntry(seedUrl);
      }
    }

    return writeAngularHmrRouteState(this.router.url, {
      pending: source === 'hmr-reboot',
      source,
    });
  }

  private installCaptureHook(): () => void {
    return installAngularHmrRouteCaptureHook(() => this.captureCurrentRoute('hmr-reboot'));
  }
}