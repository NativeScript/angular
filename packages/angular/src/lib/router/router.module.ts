import { APP_BASE_HREF, CommonModule, HashLocationStrategy, Location, LocationStrategy, LOCATION_INITIALIZED, PathLocationStrategy, PlatformLocation } from '@angular/common';
import { ApplicationRef, APP_BOOTSTRAP_LISTENER, APP_INITIALIZER, ComponentRef, Inject, Injectable, Injector, ModuleWithProviders, NgModule, NgProbeToken, NO_ERRORS_SCHEMA, Optional } from '@angular/core';
import { ExtraOptions, NoPreloading, PreloadingStrategy, provideRoutes, Router, RouterModule, RouterPreloader, ROUTER_CONFIGURATION, ROUTER_INITIALIZER, Routes, ɵROUTER_PROVIDERS } from '@angular/router';
import { of, Subject } from 'rxjs';
import { NativeScriptCommonModule } from '../nativescript-common.module';
import { START_PATH } from '../tokens';
import { NativescriptPlatformLocation } from './platform-location';

export function getAppInitializer(r: RouterInitializer) {
  return r.appInitializer.bind(r);
}

export function getBootstrapListener(r: RouterInitializer) {
  return r.bootstrapListener.bind(r);
}

@Injectable()
export class ModalRouterInitializer {
  private initNavigation = false;
  private resultOfPreactivationDone = new Subject<void>();

  constructor(private injector: Injector) {}

  bootstrapListener(bootstrappedComponentRef: ComponentRef<any>): void {
    const opts = this.injector.get(ROUTER_CONFIGURATION);
    const preloader = this.injector.get(RouterPreloader);
    // const routerScroller = this.injector.get(RouterScroller);
    const router = this.injector.get(Router);
    const ref = this.injector.get<ApplicationRef>(ApplicationRef);

    if (bootstrappedComponentRef !== ref.components[0]) {
      return;
    }

    // Default case
    if (opts.initialNavigation === 'enabledNonBlocking' || opts.initialNavigation === undefined) {
      router.initialNavigation();
    }

    preloader.setUpPreloading();
    // routerScroller.init();
    // router.resetRootComponentType(ref.componentTypes[0]);
    // this.resultOfPreactivationDone.next(null!);
    // this.resultOfPreactivationDone.complete();
  }
}

@Injectable()
export class RouterInitializer {
  private initNavigation = false;
  private resultOfPreactivationDone = new Subject<void>();

  constructor(private injector: Injector) {}

  appInitializer(): Promise<any> {
    const p: Promise<any> = this.injector.get(LOCATION_INITIALIZED, Promise.resolve(null));
    return p.then(() => {
      // eslint-disable-next-line @typescript-eslint/ban-types, @typescript-eslint/no-non-null-assertion
      let resolve: Function = null!;
      const res = new Promise((r) => (resolve = r));
      const router: any = this.injector.get(Router);
      const opts = this.injector.get(ROUTER_CONFIGURATION);

      if (opts.initialNavigation === 'disabled') {
        router.setUpLocationChangeListener();
        resolve(true);
      } else if (opts.initialNavigation === 'enabledBlocking') {
        router.hooks.afterPreactivation = () => {
          // only the initial navigation should be delayed
          if (!this.initNavigation) {
            this.initNavigation = true;
            resolve(true);
            return this.resultOfPreactivationDone;

            // subsequent navigations should not be delayed
          } else {
            return of(null) as any;
          }
        };
        router.initialNavigation();
      } else {
        resolve(true);
      }

      return res;
    });
  }
  bootstrapListener(bootstrappedComponentRef: ComponentRef<any>): void {
    const opts = this.injector.get(ROUTER_CONFIGURATION);
    const preloader = this.injector.get(RouterPreloader);
    // const routerScroller = this.injector.get(RouterScroller);
    const router: any = this.injector.get(Router);
    const ref = this.injector.get<ApplicationRef>(ApplicationRef);

    if (bootstrappedComponentRef !== ref.components[0]) {
      return;
    }

    // Default case
    if (opts.initialNavigation === 'enabledNonBlocking' || opts.initialNavigation === undefined) {
      router.initialNavigation();
    }

    preloader.setUpPreloading();
    // routerScroller.init();
    router.resetRootComponentType(ref.componentTypes[0]);
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    this.resultOfPreactivationDone.next(null!);
    this.resultOfPreactivationDone.complete();
  }
}

export function routerNgProbeToken() {
  return new NgProbeToken('Router', Router);
}

export function provideLocationStrategy(platformLocationStrategy: PlatformLocation, baseHref: string, options: ExtraOptions = {}) {
  return options.useHash ? new HashLocationStrategy(platformLocationStrategy, baseHref) : new PathLocationStrategy(platformLocationStrategy, baseHref);
}

export function provideLocationInitialized(startpath: string | Promise<string>) {
  if (startpath instanceof Promise) {
    return startpath;
  }
  return Promise.resolve(null);
}

@NgModule({
  declarations: [
    /* NSRouterLink, NSRouterLinkActive, PageRouterOutlet, NSEmptyOutletComponent */
  ],
  imports: [RouterModule, NativeScriptCommonModule],
  exports: [RouterModule /* NSRouterLink, NSRouterLinkActive, PageRouterOutlet, NSEmptyOutletComponent */],
  schemas: [NO_ERRORS_SCHEMA],
})
export class NativeScriptRouterModule {
  static forRoot(routes: Routes, config?: ExtraOptions): ModuleWithProviders<NativeScriptRouterModule> {
    const routerProviders = RouterModule.forRoot(routes, config).providers;
    return {
      ngModule: NativeScriptRouterModule,
      providers: [
        ...routerProviders,
        NativescriptPlatformLocation,
        // { provide: NativescriptPlatformLocation, useClass: NativescriptPlatformLocation, deps: [[START_PATH, new Optional()]]},
        {
          provide: PlatformLocation,
          useExisting: NativescriptPlatformLocation,
        },
        {
          provide: LOCATION_INITIALIZED,
          useFactory: provideLocationInitialized,
          deps: [[START_PATH, new Optional()]],
        },
        { provide: START_PATH, useValue: '' },
      ],
    };
    return {
      ngModule: NativeScriptRouterModule,
      providers: [
        ...ɵROUTER_PROVIDERS,
        provideRoutes(routes),
        { provide: ROUTER_CONFIGURATION, useValue: config ? config : {} },
        {
          provide: LocationStrategy,
          useFactory: provideLocationStrategy,
          deps: [PlatformLocation, [new Inject(APP_BASE_HREF), new Optional()], ROUTER_CONFIGURATION],
        },
        // {
        // 	provide: RouterScroller,
        // 	useFactory: createRouterScroller,
        // 	deps: [Router, ViewportScroller, ROUTER_CONFIGURATION]
        // },
        {
          provide: PreloadingStrategy,
          useExisting: config && config.preloadingStrategy ? config.preloadingStrategy : NoPreloading,
        },
        { provide: NgProbeToken, multi: true, useFactory: routerNgProbeToken },
        // {
        // 	provide: NSLocationStrategy,
        // 	useFactory: provideLocationStrategy,
        // 	deps: [[NSLocationStrategy, new Optional(), new SkipSelf()], FrameService],
        // },
        // { provide: LocationStrategy, useExisting: NSLocationStrategy },
        NativescriptPlatformLocation,
        // { provide: NativescriptPlatformLocation, useClass: NativescriptPlatformLocation, deps: [[START_PATH, new Optional()]]},
        {
          provide: PlatformLocation,
          useExisting: NativescriptPlatformLocation,
        },
        {
          provide: LOCATION_INITIALIZED,
          useFactory: provideLocationInitialized,
          deps: [[START_PATH, new Optional()]],
        },
        { provide: START_PATH, useValue: 'home2' },
        RouterInitializer,
        {
          provide: APP_INITIALIZER,
          multi: true,
          useFactory: getAppInitializer,
          deps: [RouterInitializer],
        },
        {
          provide: ROUTER_INITIALIZER,
          useFactory: getBootstrapListener,
          deps: [RouterInitializer],
        },
        {
          provide: APP_BOOTSTRAP_LISTENER,
          multi: true,
          useExisting: ROUTER_INITIALIZER,
        },
        // RouterExtensions,
        // NSRouteReuseStrategy,
        // { provide: RouteReuseStrategy, useExisting: NSRouteReuseStrategy },
      ],
    };
  }

  static forModal(routes: Routes, config?: ExtraOptions): ModuleWithProviders<NativeScriptRouterModule> {
    // let routerProviders = RouterModule.forRoot(routes, config).providers;
    // routerProviders = routerProviders.filter((v: any) => {
    // 	if (v && v.provide && v.provide._desc === "ROUTER_FORROOT_GUARD") {
    // 		return false;
    // 	}
    // 	return true;
    // });
    return {
      ngModule: NativeScriptRouterModule,
      providers: [
        ...ɵROUTER_PROVIDERS,
        provideRoutes(routes),
        {
          provide: LocationStrategy,
          useFactory: provideLocationStrategy,
          deps: [PlatformLocation, [new Inject(APP_BASE_HREF), new Optional()], ROUTER_CONFIGURATION],
        },
        NativescriptPlatformLocation,
        {
          provide: PlatformLocation,
          useExisting: NativescriptPlatformLocation,
        },
        { provide: ROUTER_CONFIGURATION, useValue: config ? config : {} },
        { provide: START_PATH, useValue: 'home' },
        ModalRouterInitializer,
      ],
    };
    return {
      ngModule: NativeScriptRouterModule,
      providers: [
        ...ɵROUTER_PROVIDERS,
        provideRoutes(routes),
        { provide: ROUTER_CONFIGURATION, useValue: config ? config : {} },
        {
          provide: LocationStrategy,
          useFactory: provideLocationStrategy,
          deps: [PlatformLocation, [new Inject(APP_BASE_HREF), new Optional()], ROUTER_CONFIGURATION],
        },
        {
          provide: PreloadingStrategy,
          useExisting: config && config.preloadingStrategy ? config.preloadingStrategy : NoPreloading,
        },
        { provide: NgProbeToken, multi: true, useFactory: routerNgProbeToken },
        // {
        // 	provide: NSLocationStrategy,
        // 	useFactory: provideLocationStrategy,
        // 	deps: [[NSLocationStrategy, new Optional(), new SkipSelf()], FrameService],
        // },
        // { provide: LocationStrategy, useExisting: NSLocationStrategy },
        NativescriptPlatformLocation,
        {
          provide: PlatformLocation,
          useExisting: NativescriptPlatformLocation,
        },
        { provide: START_PATH, useValue: 'home3' },
        // { provide: Location, useClass: Location},
        // RouterExtensions,
        // NSRouteReuseStrategy,
        // { provide: RouteReuseStrategy, useExisting: NSRouteReuseStrategy },
      ],
    };
  }

  static forChild(routes: Routes): ModuleWithProviders<NativeScriptRouterModule> {
    return {
      ngModule: NativeScriptRouterModule,
      providers: RouterModule.forChild(routes).providers,
    };
  }
}
