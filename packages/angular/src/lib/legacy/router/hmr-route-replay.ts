import { Injectable, OnDestroy } from '@angular/core';
import { NavigationCancel, NavigationEnd, NavigationError, Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { filter, take } from 'rxjs/operators';

import { isAngularHmrEnabled } from '../../hmr-environment';
import { NativeScriptDebug } from '../../trace';
import {
  clearAngularHmrPendingRouteHistory,
  endAngularHmrRouteRestore,
  isAngularHmrRestoringRoute,
  readAngularHmrPendingForwardNavigations,
} from './hmr-route-state-core';

/**
 * Grace period to keep `isAngularHmrRestoringRoute()` returning `true`
 * after `replayForwardNavigations()` finishes its last `navigateByUrl`.
 *
 * Why a grace period exists: NativeScript native views (TabView, BottomNavigation,
 * Frame, etc.) fire their `loaded` events asynchronously after the JS-side
 * `NavigationEnd`. User-app code wired to those events typically guards a
 * default navigation (e.g. "select first tab") with `isAngularHmrRestoringRoute()`.
 * If we close the window the instant the JS replay finishes, the loaded
 * event arrives a few hundred milliseconds later, the guard reports false,
 * and the default navigation stomps the freshly-restored route.
 *
 * 1000ms covers all the cases observed on iOS device + simulator without
 * leaving the window open long enough to interfere with genuine user
 * navigation. The fallback timeout (`fallback-timeout`) below is a safety
 * net for scenarios where this scheduled close never fires.
 */
const REPLAY_COMPLETED_GRACE_MS = 1000;

/**
 * Replays the back-stack snapshot captured by `NativeScriptAngularHmrRouteTracker`
 * during HMR. The router's initial navigation already lands on the bottom of
 * the stack (`stack[0]`); this service walks `stack[1..n]` so the user keeps
 * back navigation across HMR cycles.
 *
 * The replay is single-shot per bootstrap. Any failure (cancelled navigation,
 * unrouteable URL) aborts the rest of the replay so we don't fight the router
 * — the user keeps whichever subset of the stack we successfully re-pushed.
 */
@Injectable()
export class NativeScriptAngularHmrRouteReplay implements OnDestroy {
  private subscription?: Subscription;
  private windowFallbackTimeout?: ReturnType<typeof setTimeout>;
  private pendingCloseTimeout?: ReturnType<typeof setTimeout>;

  constructor(private readonly router: Router) {
    if (!isAngularHmrEnabled()) {
      return;
    }

    const forwardNavigations = readAngularHmrPendingForwardNavigations();

    // The restoring window is opened by `readAngularHmrPendingStartPath()`
    // when `START_PATH` resolves to a deep route. If that path resolved
    // to nothing AND we have no forward navigations, there is nothing
    // to suppress and we must close the window if it was somehow left
    // open. Otherwise we keep it open until replay finishes.
    const restoringWindowOpen = isAngularHmrRestoringRoute();

    if (forwardNavigations.length === 0) {
      // Nothing to replay; clear the pending slot so a future navigation that
      // ends in the bootstrap window doesn't carry the snapshot forward.
      clearAngularHmrPendingRouteHistory();

      if (restoringWindowOpen) {
        // Single-URL restore (no back-stack to walk): keep the window
        // open until the initial navigation completes so user-app
        // default navigations don't fire before the framework's
        // restored URL settles. We then schedule the close with the
        // same grace period as the multi-URL replay path so async
        // native `loaded` handlers still see the flag.
        this.subscription = this.router.events
          .pipe(
            filter((event) => event instanceof NavigationEnd || event instanceof NavigationCancel || event instanceof NavigationError),
            take(1),
          )
          .subscribe(() => this.scheduleRestoringWindowClose('initial-navigation-settled'));
        // Belt-and-braces: bootstrap can race with router init in
        // unusual cases. Close the window after a short timeout so we
        // never leave it stuck open and silently breaking default
        // navigations forever.
        this.windowFallbackTimeout = setTimeout(() => this.closeRestoringWindow('fallback-timeout'), 5000);
      }

      return;
    }

    if (NativeScriptDebug.isLogEnabled()) {
      NativeScriptDebug.hmrLog(`HMR back-stack replay queued: ${forwardNavigations.length} forward navigation(s)`);
    }

    this.subscription = this.router.events
      .pipe(
        filter((event) => event instanceof NavigationEnd || event instanceof NavigationCancel || event instanceof NavigationError),
        take(1),
      )
      .subscribe((event) => {
        if (event instanceof NavigationEnd) {
          void this.replayForwardNavigations(forwardNavigations);
        } else {
          // Initial navigation never landed; replay would compound the problem.
          clearAngularHmrPendingRouteHistory();
          this.closeRestoringWindow('initial-navigation-failed');
          if (NativeScriptDebug.isLogEnabled()) {
            NativeScriptDebug.hmrLog('HMR back-stack replay skipped: initial navigation did not complete');
          }
        }
      });

    // Same belt-and-braces fallback as the single-URL path above.
    this.windowFallbackTimeout = setTimeout(() => this.closeRestoringWindow('fallback-timeout'), 10000);
  }

  ngOnDestroy(): void {
    this.subscription?.unsubscribe();
    if (this.windowFallbackTimeout !== undefined) {
      clearTimeout(this.windowFallbackTimeout);
      this.windowFallbackTimeout = undefined;
    }
    if (this.pendingCloseTimeout !== undefined) {
      clearTimeout(this.pendingCloseTimeout);
      this.pendingCloseTimeout = undefined;
    }
    // Defensive: never leave the restoring window open across module
    // destruction. A subsequent reboot would otherwise see it set and
    // suppress the next default navigation indefinitely.
    this.closeRestoringWindow('replay-service-destroyed');
  }

  private closeRestoringWindow(reason: string): void {
    if (this.pendingCloseTimeout !== undefined) {
      clearTimeout(this.pendingCloseTimeout);
      this.pendingCloseTimeout = undefined;
    }
    if (!isAngularHmrRestoringRoute()) {
      return;
    }
    endAngularHmrRouteRestore();
    if (this.windowFallbackTimeout !== undefined) {
      clearTimeout(this.windowFallbackTimeout);
      this.windowFallbackTimeout = undefined;
    }
    if (NativeScriptDebug.isLogEnabled()) {
      NativeScriptDebug.hmrLog(`HMR restoring-route window closed (${reason})`);
    }
  }

  /**
   * Schedule the restoring window to close after a small grace period
   * so that asynchronous user-app handlers (e.g. NativeScript native
   * `loaded` events on TabView / BottomNavigation / Frame) still observe
   * `isAngularHmrRestoringRoute() === true` and skip default navigations
   * that would otherwise stomp the freshly-restored route.
   *
   * The grace period is bounded by the existing `fallback-timeout` so
   * we never leave the flag set indefinitely even if `setTimeout` is
   * blocked by a misbehaving consumer.
   */
  private scheduleRestoringWindowClose(reason: string): void {
    if (!isAngularHmrRestoringRoute()) {
      return;
    }
    if (this.pendingCloseTimeout !== undefined) {
      clearTimeout(this.pendingCloseTimeout);
    }
    this.pendingCloseTimeout = setTimeout(() => {
      this.pendingCloseTimeout = undefined;
      this.closeRestoringWindow(reason);
    }, REPLAY_COMPLETED_GRACE_MS);
  }

  private async replayForwardNavigations(urls: string[]): Promise<void> {
    let aborted = false;
    try {
      for (const url of urls) {
        const succeeded = await this.router.navigateByUrl(url).catch(() => false);
        if (!succeeded) {
          aborted = true;
          if (NativeScriptDebug.isLogEnabled()) {
            NativeScriptDebug.hmrLog(`HMR back-stack replay aborted at ${url}`);
          }
          return;
        }
        if (NativeScriptDebug.isLogEnabled()) {
          NativeScriptDebug.hmrLog(`HMR back-stack replay navigated to ${url}`);
        }
      }
    } finally {
      clearAngularHmrPendingRouteHistory();
      this.scheduleRestoringWindowClose(aborted ? 'replay-aborted' : 'replay-completed');
    }
  }
}
