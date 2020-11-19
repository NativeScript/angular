import { ViewportScroller, XhrFactory, ɵNullViewportScroller as NullViewportScroller } from '@angular/common';
import { ApplicationModule, ErrorHandler, Inject, NgModule, NO_ERRORS_SCHEMA, Optional, Provider, RendererFactory2, SkipSelf, StaticProvider, ɵINJECTOR_SCOPE as INJECTOR_SCOPE } from '@angular/core';
import { Color, Device, View } from '@nativescript/core';
import { AppHostView } from './app-host-view';
import { NativescriptXhrFactory } from './nativescript-xhr-factory';
import { NativeScriptRendererFactory } from './nativescript-renderer';
import { PlatformNamespaceFilter, NAMESPACE_FILTERS } from './property-filter';
import { APP_ROOT_VIEW, DEVICE, ENABLE_REUSABE_VIEWS, NATIVESCRIPT_ROOT_MODULE_ID } from './tokens';
import { ViewUtil } from './view-util';
import { DetachedLoader } from './cdk/detached-loader';
import { NativeScriptCommonModule } from './nativescript-common.module';

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
  { provide: APP_ROOT_VIEW, useFactory: generateFallbackRootView, deps: [[new Optional(), new SkipSelf(), APP_ROOT_VIEW]] },
  { provide: INJECTOR_SCOPE, useValue: 'root' },
  { provide: ErrorHandler, useFactory: errorHandler, deps: [] },
  { provide: ViewUtil, useClass: ViewUtil, deps: [NAMESPACE_FILTERS, [new Optional(), ENABLE_REUSABE_VIEWS]] },
  {
    provide: NativeScriptRendererFactory,
    useClass: NativeScriptRendererFactory,
    deps: [APP_ROOT_VIEW, NAMESPACE_FILTERS, NATIVESCRIPT_ROOT_MODULE_ID, [new Optional(), ENABLE_REUSABE_VIEWS]],
  },
  { provide: NATIVESCRIPT_ROOT_MODULE_ID, useFactory: generateRandomId },
  { provide: RendererFactory2, useExisting: NativeScriptRendererFactory },
  { provide: NAMESPACE_FILTERS, useClass: PlatformNamespaceFilter, deps: [DEVICE], multi: true },
  { provide: DEVICE, useValue: Device },
  { provide: XhrFactory, useClass: NativescriptXhrFactory, deps: [] },
];
export const NATIVESCRIPT_MODULE_PROVIDERS: Provider[] = [{ provide: ViewportScroller, useClass: NullViewportScroller }];

@NgModule({
  imports: [ApplicationModule, NativeScriptCommonModule],
  declarations: [DetachedLoader],
  providers: [...NATIVESCRIPT_MODULE_STATIC_PROVIDERS, ...NATIVESCRIPT_MODULE_PROVIDERS],
  exports: [ApplicationModule, DetachedLoader, NativeScriptCommonModule],
  schemas: [NO_ERRORS_SCHEMA],
})
export class NativeScriptModule {
  constructor(@Optional() @SkipSelf() @Inject(NativeScriptModule) parentModule: NativeScriptModule | null) {
    if (parentModule) {
      throw new Error(`NativeScriptModule has already been loaded. If you need access to common directives such as NgIf and NgFor from a lazy loaded module, import CommonModule instead.`);
    }
  }
}
