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
  snapshotAngularHmrRouteHistory,
} from './hmr-route-state-core';
export { readAngularHmrPendingStartPath } from './hmr-route-state-core';

@Injectable()
export class NativeScriptAngularHmrRouteTracker implements OnDestroy {
  private subscription?: Subscription;
  private disposeCaptureHook?: () => void;
  // Tracks whether the current `NavigationStart..NavigationEnd` pair was kicked
  // off by a popstate (frame.goBack / NSLocationStrategy.back) so that on
  // `NavigationEnd` we can pop our mirror instead of pushing a duplicate entry.
  private currentNavigationIsPopstate = false;
  private currentNavigationReplaceUrl = false;

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
        return;
      }

      if (event instanceof NavigationEnd) {
        const url = event.urlAfterRedirects || event.url;
        writeAngularHmrRouteState(url, {
          source: 'navigation-end',
        });

        if (this.currentNavigationIsPopstate) {
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