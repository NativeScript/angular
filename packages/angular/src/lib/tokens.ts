import { InjectionToken } from '@angular/core';
import { View } from '@nativescript/core';
import { NamespaceFilter } from './property-filter';

export const APP_ROOT_VIEW = new InjectionToken<View>('NativeScriptAppRootView');
export const APP_RENDERED_ROOT_VIEW = new InjectionToken<View>('NativeScriptRenderedAppRootView');
export const NATIVESCRIPT_ROOT_MODULE_ID = new InjectionToken<string | number>('NativeScriptRootModuleId');
export const NAMESPACE_FILTERS = new InjectionToken<NamespaceFilter[]>('NativeScriptNamespaceFilter');

export const START_PATH = new InjectionToken<Promise<string> | string>('NativeScriptStartPath');
export const ENABLE_REUSABE_VIEWS = new InjectionToken<boolean>('NativeScriptEnableReusableViews');
