type AngularHmrRouteState = {
  url: string;
  source: string;
  timestamp: number;
};

const CURRENT_ROUTE_KEY = '__NS_ANGULAR_HMR_CURRENT_ROUTE__';
const PENDING_START_PATH_KEY = '__NS_ANGULAR_HMR_PENDING_START_PATH__';
const CAPTURE_ROUTE_KEY = '__NS_CAPTURE_ANGULAR_HMR_ROUTE__';

function getGlobalState(): any {
  return globalThis as any;
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
  const g = getGlobalState();
  return normalizeAngularHmrRouteUrl(g[PENDING_START_PATH_KEY]?.url ?? g[PENDING_START_PATH_KEY]) || '';
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