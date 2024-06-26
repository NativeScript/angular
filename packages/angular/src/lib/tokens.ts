import { InjectionToken } from '@angular/core';
import { IDevice, Page, View } from '@nativescript/core';

export const APP_ROOT_VIEW = new InjectionToken<View>('NativeScriptAppRootView');
export const NATIVESCRIPT_ROOT_MODULE_ID = new InjectionToken<string | number>('NativeScriptRootModuleId');

export const START_PATH = new InjectionToken<Promise<string> | string>('NativeScriptStartPath');
export const ENABLE_REUSABE_VIEWS = new InjectionToken<boolean>('NativeScriptEnableReusableViews');

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
export const PREVENT_SPECIFIC_EVENTS_DURING_CD = new InjectionToken<string[]>('NativeScriptPreventSpecificEventsDuringCd');
