import { InjectionToken } from "@angular/core";
import { View } from "@nativescript/core";
import { NamespaceFilter } from "./property-filter";

export const APP_ROOT_VIEW = new InjectionToken<View>('NativeScriptAppRootView');
export const NAMESPACE_FILTERS = new InjectionToken<NamespaceFilter[]>('NativeScriptNamespaceFilter');

export const START_PATH = new InjectionToken<Promise<string> | string>('NativeScriptStartPath');

