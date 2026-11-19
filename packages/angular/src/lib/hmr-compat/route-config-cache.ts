// Runtime-import free so it can be unit tested without Angular or NativeScript.

/**
 * Private `Route` fields the Angular router (v22) writes onto route config objects when it loads
 * a lazy route or creates a route injector. There is no public API to reset them.
 *
 * A route config module that an HMR reboot does not re-evaluate hands the same `Route` objects to
 * the next app's router, which would then reuse injectors created under the destroyed app (NG0205)
 * and lazy results loaded before the edit. Re-check these names when upgrading `@angular/router`.
 */
const ROUTER_PRIVATE_ROUTE_CACHE_KEYS = [
  '_loadedComponent',
  '_loadedInjector',
  '_loadedNgModuleFactory',
  '_loadedRoutes',
  '_injector',
] as const;

const INJECTOR_KEYS = new Set<string>(['_injector', '_loadedInjector']);

/** Deletes the router's private caches from every route reachable from `routes`. */
export function clearRouteConfigCaches(routes: readonly unknown[] | null | undefined): void {
  const seen = new Set<unknown>();
  const visit = (route: unknown) => {
    if (!route || typeof route !== 'object' || seen.has(route)) {
      return;
    }
    seen.add(route);
    const record = route as Record<string, unknown>;
    for (const child of [record.children, record._loadedRoutes]) {
      if (Array.isArray(child)) {
        child.forEach(visit);
      }
    }
    for (const key of ROUTER_PRIVATE_ROUTE_CACHE_KEYS) {
      if (!Object.prototype.hasOwnProperty.call(record, key)) {
        continue;
      }
      if (INJECTOR_KEYS.has(key)) {
        try {
          (record[key] as { destroy?: () => void } | undefined)?.destroy?.();
        } catch {
          // The router destroys inactive route injectors itself; a second destroy throws.
        }
      }
      delete record[key];
    }
  };
  routes?.forEach(visit);
}
