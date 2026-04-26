type AngularHmrRouteState = {
  url: string;
  source: string;
  timestamp: number;
};

const CURRENT_ROUTE_KEY = '__NS_ANGULAR_HMR_CURRENT_ROUTE__';
const PENDING_START_PATH_KEY = '__NS_ANGULAR_HMR_PENDING_START_PATH__';
const CAPTURE_ROUTE_KEY = '__NS_CAPTURE_ANGULAR_HMR_ROUTE__';
// Stack of normalized URLs that mirrors Angular Router's back-stack while the
// app is running, and is snapshotted into `PENDING_HISTORY_KEY` when an HMR
// reboot is about to fire. After the new module bootstraps, the router replay
// hook walks the stack to rebuild the back-stack so users keep their back
// navigation across HMR cycles.
const HISTORY_KEY = '__NS_ANGULAR_HMR_ROUTE_HISTORY__';
const PENDING_HISTORY_KEY = '__NS_ANGULAR_HMR_PENDING_HISTORY__';
// Window flag set while the new bootstrap is mid-replay of a captured route
// stack. User-app code can consult this to skip default navigations that
// would otherwise stomp the route the framework is restoring (e.g. a
// bottom-nav component that defaults to its first tab on init when no
// signal-backed selection exists).
const RESTORING_KEY = '__NS_ANGULAR_HMR_RESTORING_ROUTE__';
const RESTORING_TARGET_KEY = '__NS_ANGULAR_HMR_RESTORING_ROUTE_TARGET__';

function getGlobalState(): any {
  return globalThis as any;
}

function readHistoryArray(key: string): string[] {
  const g = getGlobalState();
  const raw = g[key];
  return Array.isArray(raw) ? (raw.filter((entry) => typeof entry === 'string') as string[]) : [];
}

function writeHistoryArray(key: string, history: string[]): void {
  const g = getGlobalState();
  if (history.length > 0) {
    g[key] = history.slice();
  } else {
    delete g[key];
  }
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

export function readAngularHmrPendingStartPath(): string {
  // When a back-stack snapshot exists we boot to the bottom of the stack and
  // let `replayAngularHmrPendingForwardNavigations` walk the rest. Otherwise
  // fall back to the legacy single-URL slot so projects without history
  // tracking still land on the page they were viewing.
  const pendingHistory = readHistoryArray(PENDING_HISTORY_KEY);
  if (pendingHistory.length > 0) {
    // Open the restoring-route window so user-app default navigations
    // can step out of the framework's way until replay completes. The
    // forward-navigation walk in `NativeScriptAngularHmrRouteReplay`
    // closes the window after the final URL lands or fails. We pass
    // the deepest captured URL so consumers can compare against the
    // active router URL if they want fine-grained suppression.
    beginAngularHmrRouteRestore(pendingHistory[pendingHistory.length - 1]);
    return pendingHistory[0];
  }

  const g = getGlobalState();
  const fallback = normalizeAngularHmrRouteUrl(g[PENDING_START_PATH_KEY]?.url ?? g[PENDING_START_PATH_KEY]) || '';
  if (fallback) {
    // Single-URL fallback path: user-app code should still suppress
    // default navigations briefly — the new bootstrap is about to
    // navigate to `fallback`, so a default tab init that fires first
    // would still stomp it.
    beginAngularHmrRouteRestore(fallback);
  }
  return fallback;
}

export function invokeAngularHmrRouteCapture(): string | null {
  const g = getGlobalState();
  const capture = g[CAPTURE_ROUTE_KEY];
  if (typeof capture === 'function') {
    try {
      return capture();
    } catch {
      // Fall back to the last known router url when the active capture hook fails.
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

// ---- back-stack history primitives ------------------------------------------

/**
 * Push a URL onto the live back-stack mirror. The mirror is collapsed when the
 * incoming URL equals the top — Angular fires multiple `NavigationEnd` events
 * for the same URL during certain `replaceUrl` scenarios and we don't want to
 * inflate the stack.
 */
export function pushAngularHmrRouteHistoryEntry(value: unknown): string | null {
  const url = normalizeAngularHmrRouteUrl(value);
  if (!url) {
    return null;
  }

  const history = readHistoryArray(HISTORY_KEY);
  if (history.length > 0 && history[history.length - 1] === url) {
    return url;
  }

  history.push(url);
  writeHistoryArray(HISTORY_KEY, history);
  return url;
}

/**
 * Pop the top of the live back-stack mirror. Used when Angular reports a
 * `popstate`-triggered navigation so the mirror tracks back navigations.
 */
export function popAngularHmrRouteHistoryEntry(): string | null {
  const history = readHistoryArray(HISTORY_KEY);
  if (history.length === 0) {
    return null;
  }
  const popped = history.pop() ?? null;
  writeHistoryArray(HISTORY_KEY, history);
  return popped;
}

/**
 * Replace the top of the live back-stack mirror. Used when Angular reports a
 * `NavigationEnd` with `replaceUrl=true`, e.g. canonical-redirect cycles.
 */
export function replaceAngularHmrRouteHistoryTop(value: unknown): string | null {
  const url = normalizeAngularHmrRouteUrl(value);
  if (!url) {
    return null;
  }

  const history = readHistoryArray(HISTORY_KEY);
  if (history.length === 0) {
    history.push(url);
  } else {
    history[history.length - 1] = url;
  }
  writeHistoryArray(HISTORY_KEY, history);
  return url;
}

/**
 * Read a defensive copy of the live back-stack mirror.
 */
export function readAngularHmrRouteHistory(): string[] {
  return readHistoryArray(HISTORY_KEY);
}

/**
 * Reset the live back-stack mirror. Used by tests and on bootstrap when the
 * router cannot replay the captured stack so we don't carry stale entries
 * forward.
 */
export function clearAngularHmrRouteHistory(): void {
  const g = getGlobalState();
  delete g[HISTORY_KEY];
}

/**
 * Snapshot the live back-stack mirror under the pending-history slot so the
 * next bootstrap can read it. Called from the HMR capture hook.
 *
 * The live mirror is cleared after the copy so the freshly bootstrapped app
 * starts from an empty back-stack. The replay walks the captured snapshot
 * via `NativeScriptAngularHmrRouteReplay` which fires `NavigationEnd` for
 * every URL it touches; the new tracker subscribes to those events and
 * naturally rebuilds the live mirror to match the snapshot. Without this
 * reset the live mirror would accumulate every URL the replay re-pushes
 * across HMR cycles, growing without bound and turning subsequent snapshots
 * into runaway forward-navigation walks (each replayed forward nav from
 * `/profile` back into `/talk` creates a fresh `TalkComponent` because
 * forward navigation never reuses the cache, so the leak shows up as
 * duplicated `Norrix is not enabled` / `BottomNavComponent Router Event:`
 * lines that double on every save).
 *
 * Returns the snapshot for diagnostics. Defensive: an empty live mirror
 * leaves the pending slot untouched so a single-page snapshot still works.
 */
export function snapshotAngularHmrRouteHistory(): string[] {
  const live = readHistoryArray(HISTORY_KEY);
  if (live.length === 0) {
    return [];
  }
  writeHistoryArray(PENDING_HISTORY_KEY, live);
  // Clear the live mirror so the next bootstrap starts from a clean slate.
  // The replay will repopulate it via the new tracker's NavigationEnd
  // subscription as it walks the captured stack.
  writeHistoryArray(HISTORY_KEY, []);
  return live.slice();
}

/**
 * Read the snapshotted back-stack pending replay on the new bootstrap.
 */
export function readAngularHmrPendingRouteHistory(): string[] {
  return readHistoryArray(PENDING_HISTORY_KEY);
}

/**
 * Read URLs to navigate forward through after the initial navigation finishes.
 * The first entry of the stack is the `START_PATH` consumed by the router; the
 * rest are forward navigations to push onto the new back-stack.
 */
export function readAngularHmrPendingForwardNavigations(): string[] {
  const pending = readHistoryArray(PENDING_HISTORY_KEY);
  if (pending.length <= 1) {
    return [];
  }
  return pending.slice(1);
}

/**
 * Clear the pending snapshot. The router replay calls this once it finishes
 * walking the stack so subsequent reboots start fresh.
 */
export function clearAngularHmrPendingRouteHistory(): void {
  const g = getGlobalState();
  delete g[PENDING_HISTORY_KEY];
}

// ---- restoring-route window flag --------------------------------------------

/**
 * True while the Angular HMR layer is restoring a captured route stack
 * onto the freshly-bootstrapped router. The window opens just before
 * `START_PATH` resolves to a deep URL and closes once the router has
 * walked the entire forward navigation list (or aborted it).
 *
 * User-app code that runs default navigations on component init (e.g. a
 * bottom-nav defaulting to its first tab) can consult this flag to skip
 * its default navigation so the framework's restored route survives:
 *
 * ```ts
 * if (isAngularHmrRestoringRoute()) {
 *   return; // framework is restoring a deeper route — leave it alone.
 * }
 * defaultTabNavigation();
 * ```
 *
 * Returns `false` outside of HMR or after the replay window has closed.
 * Production builds always see `false` because the framework never
 * opens the window there.
 */
export function isAngularHmrRestoringRoute(): boolean {
  const g = getGlobalState();
  return g[RESTORING_KEY] === true;
}

/**
 * The target route the framework is currently restoring, or `null` when
 * no replay is in progress. Useful when the consumer wants to compare
 * against the current router URL.
 */
export function getAngularHmrRestoringRoute(): string | null {
  const g = getGlobalState();
  const value = g[RESTORING_TARGET_KEY];
  return typeof value === 'string' && value ? value : null;
}

/**
 * Open the restoring-route window. Called by the framework when an HMR
 * bootstrap is about to navigate to a captured deep route — never call
 * this from user code.
 *
 * `targetUrl` is what the framework intends to land on; the value can
 * be read back via {@link getAngularHmrRestoringRoute}.
 */
export function beginAngularHmrRouteRestore(targetUrl: string | null): void {
  const g = getGlobalState();
  g[RESTORING_KEY] = true;
  if (targetUrl) {
    g[RESTORING_TARGET_KEY] = targetUrl;
  } else {
    delete g[RESTORING_TARGET_KEY];
  }
}

/**
 * Close the restoring-route window. Called by the framework when the
 * replay finishes (NavigationEnd reached, replay aborted, or no
 * pending stack existed in the first place).
 */
export function endAngularHmrRouteRestore(): void {
  const g = getGlobalState();
  delete g[RESTORING_KEY];
  delete g[RESTORING_TARGET_KEY];
}