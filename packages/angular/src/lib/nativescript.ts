import { CommonModule, DOCUMENT, ViewportScroller, ɵNullViewportScroller as NullViewportScroller } from '@angular/common';
import { ModuleWithProviders, Provider, ɵangular_packages_core_core_y as SCHEDULER } from '@angular/core';
import { ElementSchemaRegistry } from '@angular/compiler';
import { ApplicationModule, APP_ID, ErrorHandler, Inject, NgModule, NgZone, Optional, PLATFORM_ID, RendererFactory2, SkipSelf, StaticProvider, Testability, ɵINJECTOR_SCOPE as INJECTOR_SCOPE } from "@angular/core";
import { NativeScriptRendererFactory } from './nativescript_renderer';
import { PlatformNamespaceFilter } from './property-filter';
import { APP_ROOT_VIEW, NAMESPACE_FILTERS } from './tokens';
import { NativeScriptCommonModule } from './nativescript_common.module';
import { AppHostView } from './app-host-view';
import { Color } from '@nativescript/core';

export function generateRootView() {
  return new AppHostView(new Color("white"));
}

export function errorHandler() {
	return new ErrorHandler();
}

export const NATIVESCRIPT_MODULE_STATIC_PROVIDERS: StaticProvider[] = [
    {provide: APP_ROOT_VIEW, useFactory: generateRootView },
    // BROWSER_SANITIZATION_PROVIDERS,
    {provide: INJECTOR_SCOPE, useValue: 'root'},
    {provide: ErrorHandler, useFactory: errorHandler, deps: []},
    // {
    //   provide: EVENT_MANAGER_PLUGINS,
    //   useClass: DomEventsPlugin,
    //   multi: true,
    //   deps: [DOCUMENT, NgZone, PLATFORM_ID]
    // },
    // {provide: EVENT_MANAGER_PLUGINS, useClass: KeyEventsPlugin, multi: true, deps: [DOCUMENT]},
    // HAMMER_PROVIDERS,
    {
      provide: NativeScriptRendererFactory,
      useClass: NativeScriptRendererFactory,
      deps: [APP_ROOT_VIEW, NAMESPACE_FILTERS]
    //   deps: [EventManager, DomSharedStylesHost, APP_ID]
    },
    {provide: RendererFactory2, useExisting: NativeScriptRendererFactory},
    // {provide: SharedStylesHost, useExisting: DomSharedStylesHost},
    // {provide: DomSharedStylesHost, useClass: DomSharedStylesHost, deps: [DOCUMENT]},
    // {provide: Testability, useClass: Testability, deps: [NgZone]},
    // {provide: EventManager, useClass: EventManager, deps: [EVENT_MANAGER_PLUGINS, NgZone]},
    // ELEMENT_PROBE_PROVIDERS,
    // { provide: ElementSchemaRegistry, useClass: NativeScriptElementSchemaRegistry, deps: [] }
    { provide: NAMESPACE_FILTERS, useClass: PlatformNamespaceFilter, deps: [], multi: true},
  ];
export const NATIVESCRIPT_MODULE_PROVIDERS: Provider[] = [
  { provide: ViewportScroller, useClass: NullViewportScroller },
]


@NgModule({
    imports: [NativeScriptCommonModule, ApplicationModule],
    providers: [...NATIVESCRIPT_MODULE_STATIC_PROVIDERS, ...NATIVESCRIPT_MODULE_PROVIDERS],
    exports: [NativeScriptCommonModule, ApplicationModule]
})
export class NativeScriptModule {
    constructor(@Optional() @SkipSelf() @Inject(NativeScriptModule) parentModule: NativeScriptModule|null) {
        if (parentModule) {
          throw new Error(
              `NativeScriptModule has already been loaded. If you need access to common directives such as NgIf and NgFor from a lazy loaded module, import CommonModule instead.`);
        }
      }
}

