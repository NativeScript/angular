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
 * Base URL that Angular's external runtime styles (relative `.css` URLs, emitted by
 * dev servers for component style HMR) are resolved against — the role
 * `document.baseURI` plays on the web. Defaults to `globalThis.__NS_DEV_ORIGIN__`,
 * which a dev server session sets; `null` when no dev server is involved.
 */
export const NATIVESCRIPT_STYLE_BASE_URL = new InjectionToken<string | null>('NativeScriptStyleBaseUrl', {
  providedIn: 'root',
  factory: () => (globalThis as { __NS_DEV_ORIGIN__?: string }).__NS_DEV_ORIGIN__ ?? null,
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
