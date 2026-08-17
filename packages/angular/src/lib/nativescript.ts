import { IMAGE_CONFIG, ViewportScroller, XhrFactory, ɵNullViewportScroller as NullViewportScroller } from '@angular/common';
import { ApplicationModule, CSP_NONCE, ErrorHandler, Inject, NgModule, NO_ERRORS_SCHEMA, Optional, Provider, RendererFactory2, SkipSelf, StaticProvider, ɵINJECTOR_SCOPE as INJECTOR_SCOPE } from '@angular/core';
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
  // No CSP in a NativeScript runtime. Providing it also stops the token's default
  // factory reading `DOCUMENT.body.querySelector()`. Must stay root-scoped: the root
  // injector resolves `providedIn: 'root'` tokens before consulting the platform.
  { provide: CSP_NONCE, useValue: null },
];
export const NATIVESCRIPT_MODULE_PROVIDERS: Provider[] = [
  { provide: ViewportScroller, useClass: NullViewportScroller },
  // Angular's dev-mode image warnings scan the DOM for <img> elements, which
  // NativeScript has none of. Angular only skips them when both flags are set,
  // and reaches for `document` as soon as a global PerformanceObserver exists.
  { provide: IMAGE_CONFIG, useValue: { disableImageSizeWarning: true, disableImageLazyLoadWarning: true } },
];

@NgModule({
  imports: [ApplicationModule, DetachedLoader, NativeScriptCommonModule],
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
