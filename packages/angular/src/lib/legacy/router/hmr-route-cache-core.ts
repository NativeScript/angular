type AngularHmrRouteLike = {
  children?: AngularHmrRouteLike[];
  _injector?: unknown;
  _loadedComponent?: unknown;
  _loadedInjector?: unknown;
  _loadedRoutes?: AngularHmrRouteLike[];
};

const ROUTE_CACHE_KEYS = ['_loadedComponent', '_loadedInjector', '_loadedRoutes', '_injector'] as const;

function clearRouteCacheField(route: Record<string, unknown>, key: (typeof ROUTE_CACHE_KEYS)[number]): boolean {
  if (!Object.prototype.hasOwnProperty.call(route, key) && route[key] === undefined) {
    return false;
  }

  try {
    delete route[key];
  } catch {
    try {
      route[key] = undefined;
    } catch {}
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