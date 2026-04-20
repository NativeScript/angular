import {
  APP_BOOTSTRAP_LISTENER,
  ENVIRONMENT_INITIALIZER,
  NgModule,
  ModuleWithProviders,
  NO_ERRORS_SCHEMA,
  Optional,
  SkipSelf,
  inject,
  makeEnvironmentProviders,
} from '@angular/core';
import {
  RouterModule,
  Routes,
  ExtraOptions,
  RouteReuseStrategy,
  RouterFeatures,
  ActivatedRoute,
  Router,
  ROUTES,
  provideRouter,
} from '@angular/router';
import { LocationStrategy, PlatformLocation } from '@angular/common';
import { NSRouterLink } from './ns-router-link';
import { NSRouterLinkActive } from './ns-router-link-active';
import { PageRouterOutlet } from './page-router-outlet';
import { NSLocationStrategy } from './ns-location-strategy';
import { NativescriptPlatformLocation } from './ns-platform-location';
import { NSRouteReuseStrategy } from './ns-route-reuse-strategy';
import { RouterExtensions } from './router-extensions';
import { FrameService } from '../frame.service';
import { NSEmptyOutletComponent } from './ns-empty-outlet.component';
import { NativeScriptCommonModule } from '../../nativescript-common.module';
import { START_PATH } from '../../tokens';
import { cloneRoutesForBootstrap } from './hmr-route-bootstrap-core';
import { NativeScriptAngularHmrRouteTracker, readAngularHmrPendingStartPath } from './hmr-route-state';

export { PageRoute } from './page-router-outlet';
export { RouterExtensions } from './router-extensions';
export { Outlet, NavigationOptions, LocationState, defaultNavOptions } from './ns-location-utils';
export { NSRouterLink } from './ns-router-link';
export { NSRouterLinkActive } from './ns-router-link-active';
export { PageRouterOutlet } from './page-router-outlet';
export { NSLocationStrategy } from './ns-location-strategy';
export { NSEmptyOutletComponent } from './ns-empty-outlet.component';

export function provideLocationStrategy(
  locationStrategy: NSLocationStrategy,
  frameService: FrameService,
  startPath: string,
): NSLocationStrategy {
  return locationStrategy ? locationStrategy : new NSLocationStrategy(frameService, startPath);
}

const ROUTER_COMPONENTS = [NSRouterLink, NSRouterLinkActive, PageRouterOutlet, NSEmptyOutletComponent];

@NgModule({
  imports: [RouterModule, NativeScriptCommonModule, ...ROUTER_COMPONENTS],
  exports: [RouterModule, ...ROUTER_COMPONENTS],
  schemas: [NO_ERRORS_SCHEMA],
})
export class NativeScriptRouterModule {
  static forRoot(routes: Routes, config?: ExtraOptions): ModuleWithProviders<NativeScriptRouterModule> {
    return {
      ngModule: NativeScriptRouterModule,
      providers: [
        ...RouterModule.forRoot(cloneRoutesForBootstrap(routes), config).providers,
        {
          provide: START_PATH,
          useFactory: readAngularHmrPendingStartPath,
        },
        {
          provide: NSLocationStrategy,
          useFactory: provideLocationStrategy,
          deps: [[NSLocationStrategy, new Optional(), new SkipSelf()], FrameService, [new Optional(), START_PATH]],
        },
        { provide: LocationStrategy, useExisting: NSLocationStrategy },
        NativescriptPlatformLocation,
        { provide: PlatformLocation, useExisting: NativescriptPlatformLocation },
        RouterExtensions,
        NSRouteReuseStrategy,
        { provide: RouteReuseStrategy, useExisting: NSRouteReuseStrategy },
        NativeScriptAngularHmrRouteTracker,
        {
          provide: APP_BOOTSTRAP_LISTENER,
          multi: true,
          deps: [NativeScriptAngularHmrRouteTracker],
          useFactory: () => () => undefined,
        },
      ],
    };
  }

  static forChild(routes: Routes): ModuleWithProviders<NativeScriptRouterModule> {
    return { ngModule: NativeScriptRouterModule, providers: RouterModule.forChild(cloneRoutesForBootstrap(routes)).providers };
  }
}
export function rootRoute(router: Router): ActivatedRoute {
  return router.routerState.root;
}

export function provideNativeScriptRouter(routes: Routes, ...features: RouterFeatures[]) {
  return makeEnvironmentProviders([
    provideRouter(cloneRoutesForBootstrap(routes), ...features),
    {
      provide: START_PATH,
      useFactory: readAngularHmrPendingStartPath,
    },
    {
      provide: NSLocationStrategy,
      useFactory: provideLocationStrategy,
      deps: [[NSLocationStrategy, new Optional(), new SkipSelf()], FrameService, [new Optional(), START_PATH]],
    },
    { provide: LocationStrategy, useExisting: NSLocationStrategy },
    NativescriptPlatformLocation,
    { provide: PlatformLocation, useExisting: NativescriptPlatformLocation },
    RouterExtensions,
    NSRouteReuseStrategy,
    { provide: RouteReuseStrategy, useExisting: NSRouteReuseStrategy },
    NativeScriptAngularHmrRouteTracker,
    {
      provide: ENVIRONMENT_INITIALIZER,
      multi: true,
      useValue: () => {
        inject(NativeScriptAngularHmrRouteTracker);
      },
    },
    // {provide: APP_BOOTSTRAP_LISTENER, multi: true, useFactory: getBootstrapListener},
  ]);
}
