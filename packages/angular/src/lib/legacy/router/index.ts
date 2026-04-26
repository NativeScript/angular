export { NSLocationStrategy } from './ns-location-strategy';
export { NSRouteReuseStrategy } from './ns-route-reuse-strategy';
export * from './router.module';
// HMR helpers user-app code can consult to coordinate with the
// framework while it restores a captured route stack on hot reload.
// `isAngularHmrRestoringRoute()` returns `false` outside of HMR (and
// always in production), so call sites can leave it permanently in
// place without guarding.
export { getAngularHmrRestoringRoute, isAngularHmrRestoringRoute } from './hmr-route-state-core';
