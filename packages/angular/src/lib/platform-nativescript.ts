import {
  Type,
  Injector,
  CompilerOptions,
  PlatformRef,
  NgModuleFactory,
  NgModuleRef,
  EventEmitter,
  Sanitizer,
  InjectionToken,
  StaticProvider,
  createPlatformFactory,
  platformCore,
  PLATFORM_ID,
  ɵinternalCreateApplication,
  ApplicationConfig,
} from '@angular/core';
import { DOCUMENT, LocationChangeListener, LocationStrategy, PlatformLocation } from '@angular/common';
import { NativeScriptPlatformRefProxy } from './platform-ref';
import { AppHostView } from './app-host-view';
import { Color, GridLayout } from '@nativescript/core';
import {
  DEFER_NATIVE_OPS_DURING_CD,
  defaultPageFactory,
  ENABLE_REUSABE_VIEWS,
  PAGE_FACTORY,
  WRAP_CD_IN_TRANSACTION,
} from './tokens';
import { AppLaunchView } from './application';
import { NATIVESCRIPT_MODULE_PROVIDERS, NATIVESCRIPT_MODULE_STATIC_PROVIDERS } from './nativescript';

export const defaultPageFactoryProvider = { provide: PAGE_FACTORY, useValue: defaultPageFactory };
export class NativeScriptSanitizer extends Sanitizer {
  sanitize(_context: any, value: string): string {
    return value;
  }
}
// TODO: when angular finally exports their scheduler token for ivy CD, provide our own with queueMacroTask
// export function schedulerFactory() {
//   return (fn: any) => {
//     console.log('SCHEDULER');
//     setTimeout(fn, 0);
//   };
// }

export class NativeScriptDocument {
  // Required by the AnimationDriver
  public body: any = {
    isOverride: true,
  };

  createElement(tag: string) {
    throw new Error('NativeScriptDocument is not DOM Document. There is no createElement() method.');
  }
}

export class DummyLocationStrategy extends LocationStrategy {
  path(includeHash?: boolean): string {
    throw new Error('Method not implemented.');
  }
  prepareExternalUrl(internal: string): string {
    throw new Error('Method not implemented.');
  }
  getState(): unknown {
    throw new Error('Method not implemented.');
  }
  pushState(state: any, title: string, url: string, queryParams: string): void {
    throw new Error('Method not implemented.');
  }
  replaceState(state: any, title: string, url: string, queryParams: string): void {
    throw new Error('Method not implemented.');
  }
  forward(): void {
    throw new Error('Method not implemented.');
  }
  back(): void {
    throw new Error('Method not implemented.');
  }
  onPopState(fn: LocationChangeListener): void {
    throw new Error('Method not implemented.');
  }
  getBaseHref(): string {
    throw new Error('Method not implemented.');
  }
}
export class DummyPlatformLocation extends PlatformLocation {
  getBaseHrefFromDOM(): string {
    throw new Error('Method not implemented.');
  }
  getState(): unknown {
    throw new Error('Method not implemented.');
  }
  onPopState(fn: LocationChangeListener): VoidFunction {
    throw new Error('Method not implemented.');
  }
  onHashChange(fn: LocationChangeListener): VoidFunction {
    throw new Error('Method not implemented.');
  }
  get href(): string {
    throw new Error('Method not implemented.');
  }
  get protocol(): string {
    throw new Error('Method not implemented.');
  }
  get hostname(): string {
    throw new Error('Method not implemented.');
  }
  get port(): string {
    throw new Error('Method not implemented.');
  }
  get pathname(): string {
    throw new Error('Method not implemented.');
  }
  get search(): string {
    throw new Error('Method not implemented.');
  }
  get hash(): string {
    throw new Error('Method not implemented.');
  }
  replaceState(state: any, title: string, url: string): void {
    throw new Error('Method not implemented.');
  }
  pushState(state: any, title: string, url: string): void {
    throw new Error('Method not implemented.');
  }
  forward(): void {
    throw new Error('Method not implemented.');
  }
  back(): void {
    throw new Error('Method not implemented.');
  }
}

export const COMMON_PROVIDERS: StaticProvider[] = [
  defaultPageFactoryProvider,
  { provide: Sanitizer, useClass: NativeScriptSanitizer, deps: [] },
  { provide: DOCUMENT, useClass: NativeScriptDocument, deps: [] },
  { provide: PLATFORM_ID, useValue: 'browser' },
  {
    provide: LocationStrategy,
    useClass: DummyLocationStrategy,
    deps: [],
  },
  { provide: PlatformLocation, useClass: DummyPlatformLocation, deps: [] },
];

export const platformNativeScript = createPlatformFactory(platformCore, 'nativescriptDynamic', COMMON_PROVIDERS);
export interface BootstrapContext {
  platformRef?: PlatformRef;
}

export interface NativeScriptApplicationConfig extends ApplicationConfig {
  reusableViews?: boolean;
  /**
   * Batch native side-effects (property/style/class writes and view
   * attaching/loading) produced during change detection and apply them once,
   * after CD finishes. The logical tree Angular reads during CD stays in sync.
   */
  deferNativeOpsDuringChangeDetection?: boolean;
  ios?: {
    wrapChangeDetectionInTransaction?: boolean;
  };
}

function createProvidersConfig(options?: NativeScriptApplicationConfig, context?: BootstrapContext) {
  const nsProviders: StaticProvider[] = [];
  if (options?.reusableViews) {
    nsProviders.push({ provide: ENABLE_REUSABE_VIEWS, useValue: true });
  }
  if (options?.ios?.wrapChangeDetectionInTransaction) {
    nsProviders.push({ provide: WRAP_CD_IN_TRANSACTION, useValue: true });
  }
  if (options?.deferNativeOpsDuringChangeDetection) {
    nsProviders.push({ provide: DEFER_NATIVE_OPS_DURING_CD, useValue: true });
  }
  return {
    platformRef: context?.platformRef,
    appProviders: [
      ...NATIVESCRIPT_MODULE_STATIC_PROVIDERS,
      ...NATIVESCRIPT_MODULE_PROVIDERS,
      ...nsProviders,
      ...(options?.providers ?? []),
    ],
    platformProviders: context?.platformRef ? [] : COMMON_PROVIDERS,
  };
}

export function bootstrapApplication(
  rootComponent: Type<any>,
  options?: NativeScriptApplicationConfig,
  context?: BootstrapContext,
) {
  return ɵinternalCreateApplication({
    rootComponent: rootComponent,
    ...createProvidersConfig(options, context),
  });
}

export function createApplication(options?: NativeScriptApplicationConfig, context?: BootstrapContext) {
  return ɵinternalCreateApplication(createProvidersConfig(options, context));
}

export interface HmrOptions {
  /**
   * A factory function that returns either Module type or NgModuleFactory type.
   * This needs to be a factory function as the types will change when modules are replaced.
   */
  moduleTypeFactory?: () => Type<any> | NgModuleFactory<any>;

  /**
   * A livesync callback that will be called instead of the original livesync.
   * It gives the HMR a hook to apply the module replacement.
   * @param bootstrapPlatform - A bootstrap callback to be called after HMR is done. It will bootstrap a new angular app within the exisiting platform, using the moduleTypeFactory to get the Module or NgModuleFactory to be used.
   */
  livesyncCallback: (bootstrapPlatform: () => void) => void;
}

export interface AppOptions {
  cssFile?: string;
  startPageActionBarHidden?: boolean;
  hmrOptions?: HmrOptions;
  /**
   * Background color of the root view
   */
  backgroundColor?: string;
  /**
   * Use animated launch view (async by default)
   */
  launchView?: AppLaunchView;
  /**
   * When using Async APP_INITIALIZER, set this to `true`.
   * (Not needed when using launchView)
   */
  async?: boolean;
}

/**
 * @deprecated use runNativeScriptAngularApp instead
 */
export const platformNativeScriptDynamic = function (options?: AppOptions, extraProviders?: StaticProvider[]) {
  console.log('platformNativeScriptDynamic is deprecated, use runNativeScriptAngularApp instead');
  options = options || {};
  extraProviders = extraProviders || [];

  const ngRootView = new AppHostView(new Color(options.backgroundColor || 'white'));
  let launchView = options.launchView;
  if (!launchView && options.async) {
    launchView = new GridLayout();
    launchView.backgroundColor = options.backgroundColor || 'white';
  }
  return new NativeScriptPlatformRefProxy(platformNativeScript([...extraProviders]), launchView);
};
