import { NgModule, ModuleWithProviders, NO_ERRORS_SCHEMA, Optional, SkipSelf } from '@angular/core';
import { RouterModule, Routes, ExtraOptions, RouteReuseStrategy } from '@angular/router';
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
import { withComponentInputBinding } from '../../router/router-component-input-binder';

export { PageRoute } from './page-router-outlet';
export { RouterExtensions } from './router-extensions';
export { Outlet, NavigationOptions, LocationState, defaultNavOptions } from './ns-location-utils';
export { NSRouterLink } from './ns-router-link';
export { NSRouterLinkActive } from './ns-router-link-active';
export { PageRouterOutlet } from './page-router-outlet';
export { NSLocationStrategy } from './ns-location-strategy';
export { NSEmptyOutletComponent } from './ns-empty-outlet.component';

export function provideLocationStrategy(locationStrategy: NSLocationStrategy, frameService: FrameService, startPath: string): NSLocationStrategy {
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
        ...RouterModule.forRoot(routes, config).providers,
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
        config?.bindToComponentInputs ? withComponentInputBinding().ɵproviders : [],
      ],
    };
  }

  static forChild(routes: Routes): ModuleWithProviders<NativeScriptRouterModule> {
    return { ngModule: NativeScriptRouterModule, providers: RouterModule.forChild(routes).providers };
  }
}
