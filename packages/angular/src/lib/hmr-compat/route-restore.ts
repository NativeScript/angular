// Runtime-import free so it can be unit tested without Angular or NativeScript.
import type { NavigationBehaviorOptions, Router, UrlSegmentGroup } from '@angular/router';
import type { HmrLog } from '../hmr-snapshots';
import type { NativeScriptHmrParticipant } from '../tokens';
import { clearRouteConfigCaches } from './route-config-cache';

export const ROUTE_PARTICIPANT_KEY = '@nativescript/angular/route';
export const ROUTE_PARTICIPANT_VERSION = 1;

export interface RouteSnapshot {
  /** `router.url` when the app was torn down. */
  url: string;
  /** `url` without its named outlets, which cannot be a start path; they are navigated to after boot. */
  bootUrl: string;
}

// Covers a reboot whose import fails; the next entry evaluation re-arms it with the boot timeout.
const RESTORE_TIMEOUT_MS = 30000;
// Bootstrap plus the dev client's 5 s stability cap.
const BOOT_TIMEOUT_MS = 10000;
// Keeps the flag up while the restored page's own start-up code runs.
const RESTORE_GRACE_MS = 1000;

// This package is never re-evaluated in a dev session, so module scope outlives every HMR reboot.
const state: {
  pending?: RouteSnapshot;
  restoring?: string;
  timer?: ReturnType<typeof setTimeout>;
} = {};

/**
 * True from the moment an HMR reboot tears the app down until shortly after the new app has
 * navigated back to the previous URL. Apps check it to skip their own start-up navigation so it
 * does not override the restored route.
 */
export function isAngularHmrRestoringRoute(): boolean {
  return state.restoring !== undefined;
}

/** URL being restored by an HMR reboot, or `null` when idle. */
export function getAngularHmrRestoringRoute(): string | null {
  return state.restoring ?? null;
}

/**
 * The URL the app being bootstrapped should start at, or undefined when no route restore is
 * pending. Kept until the restore completes, so a bootstrap that fails is retried at the same URL.
 */
export function beginRouteRestoreBoot(): string | undefined {
  const pending = state.pending;
  if (pending) {
    state.restoring = pending.url;
    armRestoreTimeout(BOOT_TIMEOUT_MS);
  }
  return pending?.bootUrl;
}

function armRestoreTimeout(ms: number): void {
  clearTimeout(state.timer);
  state.timer = setTimeout(endRouteRestore, ms);
}

function endRouteRestore(): void {
  clearTimeout(state.timer);
  state.timer = undefined;
  state.restoring = undefined;
}

/** Test seam: drop every pending restore and timer. */
export function resetRouteRestoreState(): void {
  endRouteRestore();
  state.pending = undefined;
}

export function isRouteSnapshot(value: unknown): value is RouteSnapshot {
  const snapshot = value as RouteSnapshot | null;
  return (
    !!snapshot &&
    typeof snapshot === 'object' &&
    typeof snapshot.url === 'string' &&
    typeof snapshot.bootUrl === 'string'
  );
}

// `PRIMARY_OUTLET` of @angular/router, inlined to keep this file free of runtime imports.
const PRIMARY_OUTLET = 'primary';

/** `url` with every named outlet removed, at any depth. */
export function primaryOnlyUrl(router: Pick<Router, 'parseUrl' | 'serializeUrl'>, url: string): string {
  let stripped = false;
  const strip = (group: UrlSegmentGroup) => {
    for (const outlet of Object.keys(group.children)) {
      if (outlet === PRIMARY_OUTLET) {
        strip(group.children[outlet]);
      } else {
        delete group.children[outlet];
        stripped = true;
      }
    }
  };
  try {
    const tree = router.parseUrl(url);
    strip(tree.root);
    return stripped ? router.serializeUrl(tree) : url;
  } catch {
    return '/';
  }
}

export interface RouteParticipantDeps {
  router: Pick<Router, 'url' | 'config' | 'parseUrl' | 'serializeUrl' | 'navigateByUrl'>;
  /** Destroys the detached routes held by the app's `RouteReuseStrategy`. */
  clearRouteReuseCache(): void;
  /** Resolves once the router has no navigation in flight. */
  whenNavigationSettled(): Promise<void>;
  log: HmrLog;
}

/**
 * Saves the current URL so the next app boots there (see {@link beginRouteRestoreBoot}), and
 * navigates to it after boot when the start path could not reach it (named outlets, an app
 * `START_PATH` provided after the compat one, or the app's own start-up navigation).
 */
export function createRouteParticipant(deps: RouteParticipantDeps): NativeScriptHmrParticipant {
  return {
    key: ROUTE_PARTICIPANT_KEY,
    version: ROUTE_PARTICIPANT_VERSION,
    save(): RouteSnapshot {
      // A reboot while a restore is still settling keeps the restore target, not an interim URL.
      const url = state.restoring ?? deps.router.url;
      const snapshot: RouteSnapshot = { url, bootUrl: primaryOnlyUrl(deps.router, url) };
      state.pending = snapshot;
      state.restoring = url;
      armRestoreTimeout(RESTORE_TIMEOUT_MS);
      try {
        deps.clearRouteReuseCache();
      } catch (error) {
        deps.log('Could not clear the route reuse strategy cache before an HMR reboot.', error);
      }
      try {
        clearRouteConfigCaches(deps.router.config);
      } catch (error) {
        deps.log('Could not clear the route config caches before an HMR reboot.', error);
      }
      return snapshot;
    },
    async restore(snapshot: unknown): Promise<void> {
      if (!isRouteSnapshot(snapshot)) {
        deps.log('Ignoring an invalid route snapshot.');
        return;
      }
      try {
        await deps.whenNavigationSettled();
        if (deps.router.url !== snapshot.url) {
          // `animated` is read by page-router-outlet from the navigation's extras.
          const extras = { animated: false } as NavigationBehaviorOptions;
          const navigated = await deps.router.navigateByUrl(snapshot.url, extras).catch((error: unknown) => {
            deps.log(`Could not restore the route ${snapshot.url}.`, error);
            return false;
          });
          if (!navigated) {
            deps.log(`The route ${snapshot.url} was not restored.`);
          }
        }
      } finally {
        if (state.pending?.url === snapshot.url) {
          state.pending = undefined;
        }
        armRestoreTimeout(RESTORE_GRACE_MS);
      }
    },
  };
}
