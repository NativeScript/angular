import { ViewportScroller, XhrFactory, ɵNullViewportScroller as NullViewportScroller } from '@angular/common';
import { ApplicationModule, ErrorHandler, Inject, NgModule, NO_ERRORS_SCHEMA, Optional, Provider, RendererFactory2, SkipSelf, StaticProvider, ɵINJECTOR_SCOPE as INJECTOR_SCOPE } from '@angular/core';
import { Color, View } from '@nativescript/core';
import { AppHostView } from './app-host-view';
import { NativescriptXhrFactory } from './nativescript-xhr-factory';
// import { NativeScriptCommonModule } from './nativescript_common.module';
import { NativeScriptRendererFactory } from './nativescript_renderer';
import { PlatformNamespaceFilter } from './property-filter';
import { APP_RENDERED_ROOT_VIEW, APP_ROOT_VIEW, ENABLE_REUSABE_VIEWS, NAMESPACE_FILTERS, NATIVESCRIPT_ROOT_MODULE_ID } from './tokens';
import { ViewUtil } from './view-util';

export function generateFallbackRootView(parentRootView?: View) {
  if (parentRootView) {
    return parentRootView;
  }
  return new AppHostView(new Color('white'));
}

export function errorHandler() {
  return new ErrorHandler();
}
export function generateRandomId() {
  return `${Date.now()}` + '_' + Math.random().toString(36).substr(2, 9);
}

export const NATIVESCRIPT_MODULE_STATIC_PROVIDERS: StaticProvider[] = [
  { provide: APP_RENDERED_ROOT_VIEW, useFactory: generateFallbackRootView, deps: [[new Optional(), APP_ROOT_VIEW]] },
  { provide: INJECTOR_SCOPE, useValue: 'root' },
  { provide: ErrorHandler, useFactory: errorHandler, deps: [] },
  { provide: ViewUtil, useClass: ViewUtil, deps: [NAMESPACE_FILTERS, [new Optional(), ENABLE_REUSABE_VIEWS]] },
  {
    provide: NativeScriptRendererFactory,
    useClass: NativeScriptRendererFactory,
    deps: [APP_RENDERED_ROOT_VIEW, NAMESPACE_FILTERS, NATIVESCRIPT_ROOT_MODULE_ID, [new Optional(), ENABLE_REUSABE_VIEWS]],
  },
  { provide: NATIVESCRIPT_ROOT_MODULE_ID, useFactory: generateRandomId },
  { provide: RendererFactory2, useExisting: NativeScriptRendererFactory },
  { provide: NAMESPACE_FILTERS, useClass: PlatformNamespaceFilter, deps: [], multi: true },
  { provide: XhrFactory, useClass: NativescriptXhrFactory, deps: [] },
];
export const NATIVESCRIPT_MODULE_PROVIDERS: Provider[] = [{ provide: ViewportScroller, useClass: NullViewportScroller }];

@NgModule({
  imports: [ApplicationModule],
  declarations: [],
  providers: [...NATIVESCRIPT_MODULE_STATIC_PROVIDERS, ...NATIVESCRIPT_MODULE_PROVIDERS],
  exports: [ApplicationModule],
  schemas: [NO_ERRORS_SCHEMA],
})
export class NativeScriptModule {
  constructor(@Optional() @SkipSelf() @Inject(NativeScriptModule) parentModule: NativeScriptModule | null) {
    if (parentModule) {
      throw new Error(`NativeScriptModule has already been loaded. If you need access to common directives such as NgIf and NgFor from a lazy loaded module, import CommonModule instead.`);
    }
  }
}
