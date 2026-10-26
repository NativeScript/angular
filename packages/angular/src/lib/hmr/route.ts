import type { Injector } from '@angular/core';
import { NavigationCancel, NavigationEnd, NavigationError, Router } from '@angular/router';
import { filter, take } from 'rxjs/operators';
import { NSRouteReuseStrategy } from '../legacy/router/ns-route-reuse-strategy';
import { hmrLog, hmrState, peekHmrState, registerHmrHooks } from './hmr';

const RESTORE_GRACE_MS = 1000;
const RESTORE_TIMEOUT_MS = 10000;
const NAMED_OUTLET_URL = /\([\w-]+:/;
// Router-private caches written onto route config objects. Route modules that are not re-evaluated
// keep their config objects across reboots, so these would otherwise pin classes from before the edit.
const ROUTE_CACHE_KEYS = [
  '_loadedComponent',
  '_loadedInjector',
  '_loadedNgModuleFactory',
  '_loadedRoutes',
  '_injector',
];

/**
 * True while an HMR reboot is restoring the previous URL. Apps can check this to skip
 * their own start-up navigation so it does not override the restored route.
 */
export function isAngularHmrRestoringRoute(): boolean {
  return !!peekHmrState()?.route.restoring;
}

/** URL being restored by HMR, or `null` when idle. */
export function getAngularHmrRestoringRoute(): string | null {
  return peekHmrState()?.route.restoring ?? null;
}

export function registerRouterHmrHooks(): void {
  registerHmrHooks('router', { beforeDispose: captureRoute, afterBootstrap: replayRoute });
}

/**
 * Start path for a reboot, or undefined when there is nothing to restore.
 * A named-outlet URL cannot be a start path, so it boots at `/` and is replayed afterwards.
 */
export function consumeHmrStartPath(): string | undefined {
  const route = peekHmrState()?.route;
  const target = route?.pending;
  if (!target) {
    return undefined;
  }
  route.pending = undefined;
  route.restoring = target;
  clearTimeout(route.timer);
  route.timer = setTimeout(endRestore, RESTORE_TIMEOUT_MS);
  if (NAMED_OUTLET_URL.test(target)) {
    route.forward = target;
    return '/';
  }
  return target;
}

function captureRoute(injector: Injector): void {
  const router = injector.get(Router, null);
  if (!router) {
    return;
  }
  const route = hmrState().route;
  // A reboot during a restore keeps the restore target rather than the interim `/`.
  route.pending = route.restoring ?? router.url;
  injector.get(NSRouteReuseStrategy, null)?.clearAllCaches();
  clearRouteConfigCaches(router.config);
}

function replayRoute(injector: Injector): void {
  const route = hmrState().route;
  if (!route.restoring) {
    return;
  }
  const router = injector.get(Router, null);
  const forward = route.forward;
  route.forward = undefined;
  if (!router) {
    endRestore();
    return;
  }
  const settled = async (succeeded: boolean) => {
    if (forward && succeeded) {
      await router.navigateByUrl(forward).catch(() => false);
    }
    clearTimeout(route.timer);
    route.timer = setTimeout(endRestore, RESTORE_GRACE_MS);
  };
  if (router.navigated && !router.getCurrentNavigation()) {
    void settled(true);
    return;
  }
  router.events
    .pipe(
      filter((e) => e instanceof NavigationEnd || e instanceof NavigationCancel || e instanceof NavigationError),
      take(1),
    )
    .subscribe((e) => void settled(e instanceof NavigationEnd));
}

function endRestore(): void {
  const route = hmrState().route;
  clearTimeout(route.timer);
  route.timer = undefined;
  route.forward = undefined;
  if (route.restoring) {
    hmrLog(`restored route ${route.restoring}`);
    route.restoring = undefined;
  }
}

export function clearRouteConfigCaches(routes: unknown[] | undefined | null): void {
  const seen = new Set<unknown>();
  const visit = (route: Record<string, unknown> | null | undefined) => {
    if (!route || typeof route !== 'object' || seen.has(route)) {
      return;
    }
    seen.add(route);
    for (const child of [route.children, route._loadedRoutes]) {
      if (Array.isArray(child)) {
        child.forEach(visit);
      }
    }
    for (const key of ROUTE_CACHE_KEYS) {
      if (!(key in route)) {
        continue;
      }
      if (key === '_injector' || key === '_loadedInjector') {
        try {
          (route[key] as { destroy?: () => void } | undefined)?.destroy?.();
        } catch {
          // already destroyed with the app
        }
      }
      delete route[key];
    }
  };
  routes?.forEach(visit);
}
