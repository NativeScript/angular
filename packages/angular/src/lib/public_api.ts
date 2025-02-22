export * from './views';
export * from './tokens';
export * from './property-filter';
export * from './view-refs';
export * from './app-host-view';
export {
  AppOptions,
  COMMON_PROVIDERS,
  HmrOptions,
  NativeScriptDocument,
  NativeScriptSanitizer,
  defaultPageFactoryProvider,
  platformNativeScriptDynamic,
  platformNativeScript,
  bootstrapApplication,
} from './platform-nativescript';
export * from './cdk/detached-loader';
export {
  NATIVESCRIPT_MODULE_PROVIDERS,
  NATIVESCRIPT_MODULE_STATIC_PROVIDERS,
  NativeScriptModule,
  errorHandler,
  generateFallbackRootView,
  generateRandomId,
} from './nativescript';
export { ActionBarComponent, ActionBarScope, ActionItemDirective, NavigationButtonDirective } from './cdk/action-bar';
// export * from './cdk/dialog';
export * from './cdk/frame-page';
export * from './rootcomposite.module';
export * from './cdk/list-view';
export * from './cdk/portal';
export * from './cdk/dialog';
export * from './cdk/tab-view';
export * from './cdk/platform-filters/android-filter.component';
export * from './cdk/platform-filters/apple-filter.component';
export * from './cdk/platform-filters/ios-filter.component';
export * from './cdk/platform-filters/vision-filter.component';
export * from './file-system';
export * from './nativescript-common.module';
export * from './loading.service';
export * from './detached-loader-utils';
// export * from './router/router.module';
export {
  AppLaunchView,
  AppRunOptions,
  NgModuleEvent,
  NgModuleReason,
  disableRootViewHanding,
  onAfterLivesync,
  onBeforeLivesync,
  postAngularBootstrap$,
  preAngularDisposal$,
  runNativeScriptAngularApp,
  ApplicationConfig,
} from './application';
export * from './element-registry';
export * from './nativescript-xhr-factory';
export {
  EmulatedRenderer,
  NativeScriptRendererFactory,
  COMPONENT_VARIABLE as ɵCOMPONENT_VARIABLE,
  CONTENT_ATTR as ɵCONTENT_ATTR,
  HOST_ATTR as ɵHOST_ATTR,
  NativeScriptRendererHelperService,
} from './nativescript-renderer';
export * from './utils';
export * from './forms';
export * from './animations';
export * from './http';
export * from './legacy';
export { NativeScriptDebug as ɵNativeScriptAngularDebug } from './trace';
export * from './nativescript-ng-zone';
export * from './private-exports';
