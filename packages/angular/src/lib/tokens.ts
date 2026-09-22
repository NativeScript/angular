import { InjectionToken } from '@angular/core';
import { IDevice, Page, View } from '@nativescript/core';

export const APP_ROOT_VIEW = new InjectionToken<View>('NativeScriptAppRootView');
export const NATIVESCRIPT_ROOT_MODULE_ID = new InjectionToken<string | number>('NativeScriptRootModuleId');

export const START_PATH = new InjectionToken<Promise<string> | string>('NativeScriptStartPath');
export const ENABLE_REUSABE_VIEWS = new InjectionToken<boolean>('NativeScriptEnableReusableViews', {
  providedIn: 'root',
  factory: () => false,
});
export const WRAP_CD_IN_TRANSACTION = new InjectionToken<boolean>('NativeScriptWrapChangeDetectionInTransaction', {
  providedIn: 'root',
  factory: () => false,
});

/**
 * When enabled, native side-effects produced during change detection (applying
 * native properties/styles/classes and attaching/loading native views) are
 * batched and applied once, after CD finishes. The logical view tree Angular
 * reads back during CD is always kept in sync synchronously.
 */
export const DEFER_NATIVE_OPS_DURING_CD = new InjectionToken<boolean>('NativeScriptDeferNativeOpsDuringCd', {
  providedIn: 'root',
  factory: () => false,
});

export type PageFactory = (options: PageFactoryOptions) => Page;
export interface PageFactoryOptions {
  isBootstrap?: boolean;
  isLivesync?: boolean;
  isModal?: boolean;
  isNavigation?: boolean;
  componentType?: any;
}

export const DISABLE_ROOT_VIEW_HANDLING = new InjectionToken<boolean>('NativeScriptDisableRootViewHandling');
export const DEVICE = new InjectionToken<IDevice>('NativeScriptDevice');
export const PAGE_FACTORY = new InjectionToken<PageFactory>('NativeScriptPageFactory');
export const defaultPageFactory: PageFactory = function (_opts: PageFactoryOptions) {
  return new Page();
};

export const PREVENT_CHANGE_EVENTS_DURING_CD = new InjectionToken<boolean>('NativeScriptPreventChangeEventsDuringCd');
export const PREVENT_SPECIFIC_EVENTS_DURING_CD = new InjectionToken<string[]>(
  'NativeScriptPreventSpecificEventsDuringCd',
);
