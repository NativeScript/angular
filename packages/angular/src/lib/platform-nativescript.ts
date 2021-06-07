import { Type, Injector, CompilerOptions, PlatformRef, NgModuleFactory, NgModuleRef, EventEmitter, Sanitizer, InjectionToken, StaticProvider, createPlatformFactory, platformCore } from '@angular/core';
import { DOCUMENT } from '@angular/common';
import { NativeScriptPlatformRefProxy } from './platform-ref';
import { AppHostView } from './app-host-view';
import { Color, GridLayout } from '@nativescript/core';
import { defaultPageFactory, PAGE_FACTORY } from './tokens';
import { AppLaunchView } from './application';

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

export const COMMON_PROVIDERS = [defaultPageFactoryProvider, { provide: Sanitizer, useClass: NativeScriptSanitizer, deps: [] }, { provide: DOCUMENT, useClass: NativeScriptDocument, deps: [] }];

export const platformNativeScript = createPlatformFactory(platformCore, 'nativescriptDynamic', COMMON_PROVIDERS);

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
