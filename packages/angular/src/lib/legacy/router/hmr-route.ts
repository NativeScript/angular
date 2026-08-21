import { Injectable, OnDestroy } from '@angular/core';
import { NavigationCancel, NavigationEnd, NavigationError, Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { filter, take } from 'rxjs/operators';
import { isAngularHmrEnabled } from '../../hmr';
import { NativeScriptDebug } from '../../trace';

type AngularHmrRouteState = {
  url: string;
  source: string;
  timestamp: number;
};

const CURRENT_ROUTE_KEY = '__NS_ANGULAR_HMR_CURRENT_ROUTE__';
const PENDING_START_PATH_KEY = '__NS_ANGULAR_HMR_PENDING_START_PATH__';
const PENDING_FORWARD_KEY = '__NS_ANGULAR_HMR_PENDING_FORWARD__';
const CAPTURE_ROUTE_KEY = '__NS_CAPTURE_ANGULAR_HMR_ROUTE__';
const RESTORING_KEY = '__NS_ANGULAR_HMR_RESTORING_ROUTE__';
const RESTORING_TARGET_KEY = '__NS_ANGULAR_HMR_RESTORING_ROUTE_TARGET__';
const REPLAY_COMPLETED_GRACE_MS = 1000;

function getGlobalState(): any {
  return globalThis as any;
}

function hasNamedOutletsInUrl(url: string): boolean {
  return typeof url === 'string' && /\([A-Za-z0-9_-]+:/.test(url);
}

export function normalizeAngularHmrRouteUrl(value: unknown): string | null {
  if (typeof value !== 'string') {
    return null;
  }
  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }
  if (trimmed.startsWith('/')) {
    return trimmed;
  }
  if (trimmed.startsWith('?') || trimmed.startsWith('#')) {
    return `/${trimmed}`;
  }
  return `/${trimmed.replace(/^\/+/, '')}`;
}

export function writeAngularHmrRouteState(
  value: unknown,
  options: {
    pending?: boolean;
    source: string;
  },
): string | null {
  const url = normalizeAngularHmrRouteUrl(value);
  if (!url) {
    return null;
  }
  const state: AngularHmrRouteState = {
    url,
    source: options.source,
    timestamp: Date.now(),
  };
  const g = getGlobalState();
  g[CURRENT_ROUTE_KEY] = state;
  if (options.pending) {
    g[PENDING_START_PATH_KEY] = state;
  }
  return url;
}

export function captureAngularHmrPendingStartPath(value: unknown, source = 'hmr-reboot'): string | null {
  return writeAngularHmrRouteState(value, { pending: true, source });
}

export function readAngularHmrCurrentRoute(): string {
  const g = getGlobalState();
  return normalizeAngularHmrRouteUrl(g[CURRENT_ROUTE_KEY]?.url ?? g[CURRENT_ROUTE_KEY]) || '';
}

function readPendingStartUrl(): string {
  const g = getGlobalState();
  return normalizeAngularHmrRouteUrl(g[PENDING_START_PATH_KEY]?.url ?? g[PENDING_START_PATH_KEY]) || '';
}

function writePendingForward(url: string | null): void {
  const g = getGlobalState();
  if (url) {
    g[PENDING_FORWARD_KEY] = url;
  } else {
    delete g[PENDING_FORWARD_KEY];
  }
}

export function readAngularHmrPendingStartPath(): string {
  const target = readPendingStartUrl();
  if (!target) {
    return '';
  }
  beginAngularHmrRouteRestore(target);
  if (hasNamedOutletsInUrl(target)) {
    writePendingForward(target);
    return '/';
  }
  return target;
}

export function readAngularHmrPendingForwardNavigations(): string[] {
  const pending = getGlobalState()[PENDING_FORWARD_KEY];
  const target = typeof pending === 'string' ? pending : '';
  if (target && hasNamedOutletsInUrl(target)) {
    return [target];
  }
  const start = readPendingStartUrl();
  if (start && hasNamedOutletsInUrl(start)) {
    return [start];
  }
  return [];
}

export function clearAngularHmrPendingForwardNavigation(): void {
  delete getGlobalState()[PENDING_FORWARD_KEY];
}

export function invokeAngularHmrRouteCapture(): string | null {
  const g = getGlobalState();
  const capture = g[CAPTURE_ROUTE_KEY];
  if (typeof capture === 'function') {
    try {
      return capture();
    } catch {
      // ignore
    }
  }
  return captureAngularHmrPendingStartPath(g[CURRENT_ROUTE_KEY]?.url ?? g[CURRENT_ROUTE_KEY], 'hmr-fallback');
}

export function installAngularHmrRouteCaptureHook(capture: () => string | null): () => void {
  const g = getGlobalState();
  g[CAPTURE_ROUTE_KEY] = capture;
  return () => {
    if (g[CAPTURE_ROUTE_KEY] === capture) {
      delete g[CAPTURE_ROUTE_KEY];
    }
  };
}

/**
 * True while HMR is restoring the captured current URL.
 */
export function isAngularHmrRestoringRoute(): boolean {
  return getGlobalState()[RESTORING_KEY] === true;
}

/**
 * Target URL currently being restored, or `null` when idle.
 */
export function getAngularHmrRestoringRoute(): string | null {
  const value = getGlobalState()[RESTORING_TARGET_KEY];
  return typeof value === 'string' && value ? value : null;
}

export function beginAngularHmrRouteRestore(targetUrl: string | null): void {
  const g = getGlobalState();
  g[RESTORING_KEY] = true;
  if (targetUrl) {
    g[RESTORING_TARGET_KEY] = targetUrl;
  } else {
    delete g[RESTORING_TARGET_KEY];
  }
}

export function endAngularHmrRouteRestore(): void {
  const g = getGlobalState();
  delete g[RESTORING_KEY];
  delete g[RESTORING_TARGET_KEY];
}

export function resetAngularHmrRouteState(): void {
  const g = getGlobalState();
  delete g[CURRENT_ROUTE_KEY];
  delete g[PENDING_START_PATH_KEY];
  delete g[PENDING_FORWARD_KEY];
  delete g[CAPTURE_ROUTE_KEY];
  endAngularHmrRouteRestore();
}

type AngularBootstrapRouteLike = {
  children?: AngularBootstrapRouteLike[];
};

function isPlainObject(value: unknown): value is Record<string, unknown> {
  if (!value || typeof value !== 'object') {
    return false;
  }
  const proto = Object.getPrototypeOf(value);
  return proto === Object.prototype || proto === null;
}

function cloneRouteValue(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.slice();
  }
  if (isPlainObject(value)) {
    return { ...value };
  }
  return value;
}

function cloneBootstrapRoute<T extends object>(route: T): T {
  const next: AngularBootstrapRouteLike = {};
  for (const [key, value] of Object.entries(route as Record<string, unknown>)) {
    if (key.startsWith('_') || key.startsWith('ɵ')) {
      continue;
    }
    if (key === 'children' && Array.isArray(value)) {
      next.children = cloneRoutesForBootstrap(value);
      continue;
    }
    next[key] = cloneRouteValue(value);
  }
  return next as T;
}

export function cloneRoutesForBootstrap<T extends object>(routes: T[] | undefined | null): T[] {
  if (!Array.isArray(routes)) {
    return [];
  }
  return routes.map((route) => cloneBootstrapRoute(route));
}

type AngularHmrRouteLike = {
  children?: AngularHmrRouteLike[];
  _injector?: unknown;
  _loadedComponent?: unknown;
  _loadedInjector?: unknown;
  _loadedNgModuleFactory?: unknown;
  _loadedRoutes?: AngularHmrRouteLike[];
};

const ROUTE_CACHE_KEYS = ['_loadedComponent', '_loadedInjector', '_loadedNgModuleFactory', '_loadedRoutes', '_injector'] as const;

function destroyRouteCacheValue(value: unknown): void {
  if (!value || typeof value !== 'object') {
    return;
  }
  const destroy = (value as { destroy?: () => void }).destroy;
  if (typeof destroy === 'function') {
    try {
      destroy.call(value);
    } catch {
      // ignore
    }
  }
}

function clearRouteCacheField(route: Record<string, unknown>, key: (typeof ROUTE_CACHE_KEYS)[number]): boolean {
  if (!Object.prototype.hasOwnProperty.call(route, key) && route[key] === undefined) {
    return false;
  }
  if (key === '_injector' || key === '_loadedInjector' || key === '_loadedNgModuleFactory') {
    destroyRouteCacheValue(route[key]);
  }
  try {
    delete route[key];
  } catch {
    try {
      route[key] = undefined;
    } catch {
      // ignore
    }
  }
  return true;
}

export function clearAngularHmrRouteConfigCaches(routes: AngularHmrRouteLike[] | undefined | null): number {
  const seen = new Set<AngularHmrRouteLike>();
  let cleared = 0;
  const visitRoute = (route: AngularHmrRouteLike | undefined | null): void => {
    if (!route || seen.has(route)) {
      return;
    }
    seen.add(route);
    const childRoutes = Array.isArray(route.children) ? route.children : [];
    const loadedRoutes = Array.isArray(route._loadedRoutes) ? route._loadedRoutes : [];
    for (const childRoute of childRoutes) {
      visitRoute(childRoute);
    }
    for (const loadedRoute of loadedRoutes) {
      visitRoute(loadedRoute);
    }
    for (const key of ROUTE_CACHE_KEYS) {
      if (clearRouteCacheField(route as Record<string, unknown>, key)) {
        cleared += 1;
      }
    }
  };
  for (const route of Array.isArray(routes) ? routes : []) {
    visitRoute(route);
  }
  return cleared;
}

@Injectable()
export class NativeScriptAngularHmrRouteTracker implements OnDestroy {
  private subscription?: Subscription;
  private disposeCaptureHook?: () => void;

  constructor(private readonly router: Router) {
    if (!isAngularHmrEnabled()) {
      return;
    }
    this.disposeCaptureHook = installAngularHmrRouteCaptureHook(() => this.captureCurrentRoute('hmr-reboot'));
    this.captureCurrentRoute('bootstrap');
    this.subscription = this.router.events.subscribe((event) => {
      if (event instanceof NavigationEnd) {
        writeAngularHmrRouteState(event.urlAfterRedirects || event.url, { source: 'navigation-end' });
      }
    });
  }

  ngOnDestroy(): void {
    this.subscription?.unsubscribe();
    this.disposeCaptureHook?.();
  }

  private captureCurrentRoute(source: string): string | null {
    return writeAngularHmrRouteState(this.router.url, {
      pending: source === 'hmr-reboot',
      source,
    });
  }
}

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
    const restoringWindowOpen = isAngularHmrRestoringRoute();

    if (forwardNavigations.length === 0) {
      clearAngularHmrPendingForwardNavigation();
      if (restoringWindowOpen) {
        this.subscription = this.router.events
          .pipe(
            filter((event) => event instanceof NavigationEnd || event instanceof NavigationCancel || event instanceof NavigationError),
            take(1),
          )
          .subscribe(() => this.scheduleRestoringWindowClose('initial-navigation-settled'));
        this.windowFallbackTimeout = setTimeout(() => this.closeRestoringWindow('fallback-timeout'), 5000);
      }
      return;
    }

    this.subscription = this.router.events
      .pipe(
        filter((event) => event instanceof NavigationEnd || event instanceof NavigationCancel || event instanceof NavigationError),
        take(1),
      )
      .subscribe((event) => {
        if (event instanceof NavigationEnd) {
          void this.replayForwardNavigation(forwardNavigations[0]);
        } else {
          clearAngularHmrPendingForwardNavigation();
          this.closeRestoringWindow('initial-navigation-failed');
        }
      });

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

  private async replayForwardNavigation(url: string): Promise<void> {
    let aborted = false;
    try {
      const succeeded = await this.router.navigateByUrl(url).catch(() => false);
      if (!succeeded) {
        aborted = true;
      }
    } finally {
      clearAngularHmrPendingForwardNavigation();
      this.scheduleRestoringWindowClose(aborted ? 'replay-aborted' : 'replay-completed');
    }
  }
}
