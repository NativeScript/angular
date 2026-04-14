import * as AngularCore from '@angular/core';
import { ApplicationRef, EnvironmentProviders, NgModuleRef, NgZone, PlatformRef, Provider } from '@angular/core';
import {
  Application,
  ApplicationEventData,
  Color,
  LaunchEventData,
  LayoutBase,
  profile,
  removeTaggedAdditionalCSS,
  TextView,
  Utils,
  View,
} from '@nativescript/core';
import { Observable, Subject } from 'rxjs';
import { filter, map, take } from 'rxjs/operators';
import { AppHostView } from './app-host-view';
import { NativeScriptLoadingService } from './loading.service';
import { APP_ROOT_VIEW, DISABLE_ROOT_VIEW_HANDLING, NATIVESCRIPT_ROOT_MODULE_ID } from './tokens';
import { NativeScriptDebug } from './trace';

// Store the original @angular/core module for HMR
// This is crucial because HMR imports a fresh @angular/core with empty LView tracking
// We need to use the original one that has the registered LViews
(globalThis as any).__NS_ANGULAR_CORE__ = AngularCore;

export interface AppLaunchView extends LayoutBase {
  // called when the animation is to begin
  startAnimation?: () => void;
  // called when bootstrap is complete and cleanup can begin
  // should resolve when animation is completely finished
  cleanup?: () => Promise<any>;

  // do you want to handle setting this as a rootview manually?
  __disable_root_view_handling?: boolean;
}

export function disableRootViewHanding(view: AppLaunchView) {
  view.__disable_root_view_handling = true;
}

export type NgModuleReason = 'hotreload' | 'applaunch' | 'appexit';

export type NgModuleEvent =
  | {
      moduleType: 'main' | 'loading' | string;
      reference: NgModuleRef<unknown> | ApplicationRef;
      reason: NgModuleReason | string;
    }
  | {
      moduleType: 'platform';
      reference: PlatformRef;
      reason: NgModuleReason | string;
    };

export const preAngularDisposal$ = new Subject<NgModuleEvent>();
export const postAngularBootstrap$ = new Subject<NgModuleEvent>();

/**
 * @deprecated
 */
export const onBeforeLivesync: Observable<NgModuleRef<any>> = preAngularDisposal$.pipe(
  filter((v) => v.moduleType === 'main' && v.reason === 'hotreload'),
  map((v) => v.reference as NgModuleRef<any>),
);
/**
 * @deprecated
 */
export const onAfterLivesync: Observable<{
  moduleRef?: NgModuleRef<any>;
  error?: Error;
}> = postAngularBootstrap$.pipe(
  filter((v) => v.moduleType === 'main'),
  map((v) => ({ moduleRef: v.reference as NgModuleRef<any> })),
);
export interface AppRunOptions<T, K> {
  /**
   * Runs when the app is launched or during HMR.
   * May not run immediately if the app was started in background (e.g. push notification)
   * @param reason reason for bootstrap. @see {NgModuleReason}
   * @returns Promise to the bootstrapped NgModuleRef
   */
  appModuleBootstrap: (reason: NgModuleReason) => Promise<NgModuleRef<T> | ApplicationRef>;
  /**
   * Loads a custom NgModule for the loading screen.
   * This loads only if appModuleBootstrap doesn't resolve synchronously (e.g. async APP_INITIALIZER).
   * @param reason reason for bootstrap. @see {NgModuleReason}
   * @returns Promise to the bootstrapped NgModuleRef. Must resolve immediately (no async initialization)
   */
  loadingModule?: (reason: NgModuleReason) => Promise<NgModuleRef<K> | ApplicationRef>;
  /**
   * Simpler than loadingModule, this will show a view while the app is bootstrapping asynchronously.
   * @param reason reason for bootstrap. @see {NgModuleReason}
   * @returns View that will be shown while app boots
   */
  launchView?: (reason: NgModuleReason) => AppLaunchView;
  /**
   * Wether we are running in an embedded context (e.g. embedding NativeScript in an existing app)
   */
  embedded?: boolean;
}

if (import.meta['webpackHot']) {
  import.meta['webpackHot'].decline();
  global.__onLiveSyncCore = () => {
    Application.getRootView()?._onCssStateChange();
    // all other changes are applied by runNativeScriptAngularApp
  };
}

function emitModuleBootstrapEvent<T>(
  ref: NgModuleRef<T> | ApplicationRef,
  name: 'main' | 'loading',
  reason: NgModuleReason,
) {
  postAngularBootstrap$.next({
    moduleType: name,
    reference: ref,
    reason,
  });
}

function destroyRef<T>(ref: NgModuleRef<T> | ApplicationRef, name: 'main' | 'loading', reason: NgModuleReason): void;
function destroyRef(ref: PlatformRef, reason: NgModuleReason): void;
function destroyRef<T>(ref: PlatformRef | ApplicationRef | NgModuleRef<T>, name?: string, reason?: string): void {
  if (ref) {
    if (ref instanceof PlatformRef) {
      preAngularDisposal$.next({
        moduleType: 'platform',
        reference: ref,
        reason: name,
      });
    }
    if (ref instanceof NgModuleRef || ref instanceof ApplicationRef) {
      preAngularDisposal$.next({
        moduleType: name,
        reference: ref,
        reason,
      });
    }
    ref.destroy();
  }
}

function runZoneSyncTask(fn: () => void) {
  if (typeof Zone === 'undefined') {
    return;
  }
  const zone = Zone.current;
  const task = zone.scheduleEventTask(
    'sync_function',
    fn,
    {},
    () => {
      //
    },
    () => {
      //
    },
  );
  try {
    // console.log(task.state);
    task.invoke();
    // zone.runTask(task);
    // console.log(task.state);
  } finally {
    zone.cancelTask(task);
  }
}

function ZoneCanWorkSync() {
  let canRunSync = false;
  runZoneSyncTask(() => {
    Promise.resolve().then(() => (canRunSync = true));
  });
  return canRunSync;
}

/**
 * Tests if global.__drainMicrotaskQueue can be used to drain microtasks
 * Because of Zone.js, even though the native queue might be drained, zone microtasks might not be
 * @param makeTestDrain should it drain the current microtask queue to ensure the queue can be drained
 * @returns if global.__drainMicrotaskQueue can be called
 */
function nativeQueueCanBeDrained(makeTestDrain: boolean) {
  if (typeof (global as any).__drainMicrotaskQueue !== 'function') {
    return false;
  }
  if (!makeTestDrain) {
    return true;
  }
  let canRunSync = false;
  Promise.resolve().then(() => (canRunSync = true));
  (global as any).__drainMicrotaskQueue();
  return canRunSync;
}

/**
 * Runs a function in the most synchronous way possible
 * @param fn function to run
 * @param done function to chain after done
 */
function runSynchronously(fn: () => void, done?: () => void): void {
  if (typeof Zone !== 'undefined' && ZoneCanWorkSync()) {
    runZoneSyncTask(fn);
    done?.();
    return;
  }
  if (nativeQueueCanBeDrained(true)) {
    fn();
    (global as any).__drainMicrotaskQueue();
    done?.();
    return;
  }
  fn();
  if (done) {
    Utils.queueMacrotask(done);
  }
}

export interface ApplicationConfig {
  /**
   * List of providers that should be available to the root component and all its children.
   */
  providers: Array<Provider | EnvironmentProviders>;
}

export function runNativeScriptAngularApp<T, K>(options: AppRunOptions<T, K>) {
  let mainModuleRef: NgModuleRef<T> | ApplicationRef = null;
  let loadingModuleRef: NgModuleRef<K> | ApplicationRef;
  let platformRef: PlatformRef = null;
  let bootstrapId = -1;
  const updatePlatformRef = (moduleRef: NgModuleRef<T | K> | ApplicationRef, reason: NgModuleReason) => {
    const newPlatformRef = moduleRef.injector.get(PlatformRef);
    if (newPlatformRef === platformRef) {
      return;
    }
    destroyRef(platformRef, reason);
    platformRef = newPlatformRef;
    platformRef.onDestroy(() => (platformRef = platformRef === newPlatformRef ? null : platformRef));
  };
  let launchEventDone = true;
  let targetRootView: View = null;
  const setRootView = (ref: NgModuleRef<T | K> | ApplicationRef | View) => {
    console.log('[ng-hmr] setRootView called, bootstrapId:', bootstrapId, 'ref type:', ref?.constructor?.name);
    if (bootstrapId === -1) {
      // treat edge cases
      console.log('[ng-hmr] setRootView: bootstrapId is -1, returning early');
      return;
    }
    if (ref instanceof NgModuleRef || ref instanceof ApplicationRef) {
      if (ref.injector.get(DISABLE_ROOT_VIEW_HANDLING, false)) {
        console.log('[ng-hmr] setRootView: DISABLE_ROOT_VIEW_HANDLING is true, returning');
        return;
      }
    } else {
      if (ref['__disable_root_view_handling']) {
        console.log('[ng-hmr] setRootView: __disable_root_view_handling is true, returning');
        return;
      }
    }
    Application.getRootView()?._closeAllModalViewsInternal(); // cleanup old rootview
    NativeScriptDebug.bootstrapLog(`Setting RootView ${launchEventDone ? 'outside of' : 'during'} launch event`);
    // TODO: check for leaks when root view isn't properly destroyed
    if (ref instanceof View) {
      console.log('[ng-hmr] setRootView: ref is View, launchEventDone:', launchEventDone);
      if (NativeScriptDebug.isLogEnabled()) {
        NativeScriptDebug.bootstrapLog(`Setting RootView to ${ref}`);
      }
      if (options.embedded) {
        Application.run({ create: () => ref });
      } else if (launchEventDone) {
        Application.resetRootView({ create: () => ref });
      } else {
        targetRootView = ref;
      }
      return;
    }
    const view = ref.injector.get(APP_ROOT_VIEW) as AppHostView | View;
    const newRoot = view instanceof AppHostView ? view.content : view;
    console.log(
      '[ng-hmr] setRootView: view from injector:',
      view?.constructor?.name,
      'newRoot:',
      newRoot?.constructor?.name,
    );
    console.log('[ng-hmr] setRootView: launchEventDone:', launchEventDone, 'embedded:', options.embedded);
    if (NativeScriptDebug.isLogEnabled()) {
      NativeScriptDebug.bootstrapLog(`Setting RootView to ${newRoot}`);
    }
    if (options.embedded) {
      console.log('[ng-hmr] setRootView: calling Application.run (embedded)');
      Application.run({ create: () => newRoot });
    } else if (launchEventDone) {
      console.log('[ng-hmr] setRootView: calling Application.resetRootView');
      console.log('[ng-hmr] setRootView: newRoot details:', {
        type: newRoot?.constructor?.name,
        nativeView: !!newRoot?.nativeView,
        parent: newRoot?.parent?.constructor?.name,
        childCount: (newRoot as any)?.getChildrenCount?.() ?? 'N/A',
      });
      Application.resetRootView({ create: () => newRoot });
      console.log('[ng-hmr] setRootView: Application.resetRootView returned');
      // Check root view after reset
      setTimeout(() => {
        const currentRoot = Application.getRootView();
        console.log('[ng-hmr] setRootView: after reset, getRootView:', {
          type: currentRoot?.constructor?.name,
          nativeView: !!currentRoot?.nativeView,
          childCount: (currentRoot as any)?.getChildrenCount?.() ?? 'N/A',
        });
      }, 100);
    } else {
      console.log('[ng-hmr] setRootView: setting targetRootView (launch in progress)');
      targetRootView = newRoot;
    }
  };
  const showErrorUI = (error: Error) => {
    const message = error.message + '\n\n' + error.stack;
    const errorTextBox = new TextView();
    errorTextBox.text = message;
    errorTextBox.color = new Color('red');
    setRootView(errorTextBox);
  };
  const bootstrapRoot = (reason: NgModuleReason) => {
    console.log('[ng-hmr] bootstrapRoot called, reason:', reason);
    try {
      bootstrapId = Date.now();
      console.log('[ng-hmr] bootstrapRoot: new bootstrapId:', bootstrapId);
      const currentBootstrapId = bootstrapId;
      let bootstrapped = false;
      let onMainBootstrap = () => {
        setRootView(mainModuleRef);
      };
      runSynchronously(
        () =>
          options.appModuleBootstrap(reason).then(
            (ref) => {
              console.log('[ng-hmr] appModuleBootstrap resolved, ref:', ref?.constructor?.name);
              console.log('[ng-hmr] currentBootstrapId:', currentBootstrapId, 'bootstrapId:', bootstrapId);
              if (currentBootstrapId !== bootstrapId) {
                // this module is old and not needed anymore
                // this may happen when developer uses async app initializer and the user exits the app before this bootstraps
                console.log('[ng-hmr] bootstrap ID mismatch, destroying ref');
                ref.destroy();
                return;
              }

              // When Zone.js is active and we're outside the Angular zone (which
              // happens in HMR mode — the Promise .then() runs in the root zone),
              // wrap the completion handler inside NgZone.run() so that:
              // 1. resetRootView + component initialization happens inside the Angular zone
              // 2. ngrx effects, store dispatches, and signal-triggered actions run inside NgZone
              // 3. strictActionWithinNgZone checks pass for initial actions
              // In zoneless apps (no Zone.js), skip the wrapping entirely.
              const useZoneWrap = typeof Zone !== 'undefined' && !NgZone.isInAngularZone();
              const runInZone = (fn: () => void) => {
                if (useZoneWrap) {
                  ref.injector.get(NgZone).run(fn);
                } else {
                  fn();
                }
              };
              runInZone(() => {
                mainModuleRef = ref;

                // Expose ApplicationRef for HMR to trigger change detection
                // Check for ApplicationRef by duck-typing since instanceof can fail across module realms
                const refAny = ref as any;
                const isAppRef = refAny && typeof refAny.tick === 'function' && Array.isArray(refAny.components);
                console.log(
                  '[ng-hmr] ref type check: isAppRef=',
                  isAppRef,
                  'has tick=',
                  typeof refAny?.tick === 'function',
                  'has components=',
                  Array.isArray(refAny?.components),
                );

                if (isAppRef) {
                  global['__NS_ANGULAR_APP_REF__'] = ref;
                  // Mark boot complete for the HMR system
                  global['__NS_HMR_BOOT_COMPLETE__'] = true;

                  // Register bootstrapped components for HMR lookup
                  if (!global['__NS_ANGULAR_COMPONENTS__']) {
                    global['__NS_ANGULAR_COMPONENTS__'] = {};
                  }
                  // Get the component class from the first bootstrapped component
                  console.log('[ng-hmr] ApplicationRef components count:', refAny.components?.length);
                  if (refAny.components && refAny.components.length > 0) {
                    const componentRef = refAny.components[0];
                    console.log('[ng-hmr] componentRef:', componentRef?.constructor?.name);
                    console.log('[ng-hmr] componentRef.componentType:', componentRef?.componentType?.name);

                    // For Angular 17+ standalone components, the component type is on componentRef.componentType
                    // For older Angular, try componentRef.instance.constructor
                    let componentType = componentRef?.componentType;
                    if (!componentType && componentRef?.instance) {
                      componentType = componentRef.instance.constructor;
                    }

                    if (componentType && componentType.name) {
                      global['__NS_ANGULAR_COMPONENTS__'][componentType.name] = componentType;
                      console.log('[ng-hmr] Registered component for HMR:', componentType.name);
                    } else {
                      console.log('[ng-hmr] Could not get componentType name');
                    }
                  } else {
                    console.log('[ng-hmr] No components in ApplicationRef');
                  }
                } else {
                  const appRef = ref.injector.get(ApplicationRef, null);
                  if (appRef) {
                    global['__NS_ANGULAR_APP_REF__'] = appRef;
                    // Mark boot complete for the HMR system
                    global['__NS_HMR_BOOT_COMPLETE__'] = true;
                  }
                }

                (isAppRef ? refAny.components[0] : ref).onDestroy(
                  () => (mainModuleRef = mainModuleRef === ref ? null : mainModuleRef),
                );
                updatePlatformRef(ref, reason);
                const styleTag = ref.injector.get(NATIVESCRIPT_ROOT_MODULE_ID);
                (isAppRef ? refAny.components[0] : ref).onDestroy(() => {
                  removeTaggedAdditionalCSS(styleTag);
                });
                bootstrapped = true;
                onMainBootstrap();
                emitModuleBootstrapEvent(ref, 'main', reason);
                // bootstrapped component: (ref as any)._bootstrapComponents[0];
              });
            },
            (err) => {
              bootstrapped = true;
              NativeScriptDebug.bootstrapLogError(`Error bootstrapping app module:\n${err.message}\n\n${err.stack}`);
              showErrorUI(err);
              throw err;
            },
          ),
        () => {
          if (currentBootstrapId !== bootstrapId) {
            return;
          }
          if (!bootstrapped) {
            if (options.loadingModule) {
              runSynchronously(() =>
                options.loadingModule(reason).then(
                  (loadingRef) => {
                    if (currentBootstrapId !== bootstrapId) {
                      // this module is old and not needed anymore
                      // this may happen when developer uses async app initializer and the user exits the app before this bootstraps
                      loadingRef.destroy();
                      return;
                    }
                    loadingModuleRef = loadingRef;
                    (loadingModuleRef instanceof ApplicationRef
                      ? loadingModuleRef.components[0]
                      : loadingModuleRef
                    ).onDestroy(() => (loadingModuleRef = loadingModuleRef === loadingRef ? null : loadingModuleRef));
                    updatePlatformRef(loadingRef, reason);
                    const styleTag = loadingModuleRef.injector.get(NATIVESCRIPT_ROOT_MODULE_ID);
                    (loadingModuleRef instanceof ApplicationRef
                      ? loadingModuleRef.components[0]
                      : loadingModuleRef
                    ).onDestroy(() => {
                      removeTaggedAdditionalCSS(styleTag);
                    });
                    setRootView(loadingRef);
                    onMainBootstrap = () => {
                      // delay showing the new rootview to avoid flashes
                      Utils.queueMacrotask(() => {
                        const loadingService = loadingModuleRef.injector.get(NativeScriptLoadingService);
                        loadingModuleRef.injector.get(NgZone).run(() => {
                          loadingService._notifyMainModuleReady();
                        });
                        loadingService.readyToDestroy$
                          .pipe(
                            filter((ready) => ready),
                            take(1),
                          )
                          .subscribe(() => {
                            destroyRef(loadingModuleRef, 'loading', reason);
                            loadingModuleRef = null;
                            setRootView(mainModuleRef);
                          });
                      });
                    };
                    emitModuleBootstrapEvent(loadingModuleRef, 'loading', reason);
                  },
                  (err) => {
                    NativeScriptDebug.bootstrapLogError(
                      `Error bootstrapping loading module:\n${err.message}\n\n${err.stack}`,
                    );
                    showErrorUI(err);
                    throw err;
                  },
                ),
              );
            } else if (options.launchView) {
              let launchView = options.launchView(reason);
              setRootView(launchView);
              if (launchView.startAnimation) {
                setTimeout(() => {
                  // ensure launch animation is executed after launchView added to view stack
                  launchView.startAnimation();
                });
              }
              onMainBootstrap = () => {
                // delay showing the new rootview to avoid flashes
                Utils.queueMacrotask(() => {
                  if (launchView.cleanup) {
                    launchView
                      .cleanup()
                      .catch()
                      .then(() => {
                        launchView = null;
                        setRootView(mainModuleRef);
                      });
                  } else {
                    launchView = null;
                    setRootView(mainModuleRef);
                  }
                });
              };
            } else {
              console.warn(
                'App is bootstrapping asynchronously (likely APP_INITIALIZER) but did not provide a launchView or LoadingModule.',
              );
            }
          }
        },
      );
    } catch (err) {
      NativeScriptDebug.bootstrapLogError(`Error in Bootstrap Function:\n${err.message}\n\n${err.stack}`);
    }
  };
  const disposePlatform = (reason: NgModuleReason) => {
    destroyRef(platformRef, reason);
    platformRef = null;
  };
  const disposeLastModules = (reason: NgModuleReason) => {
    // reset bootstrap ID to make sure any modules bootstrapped after this are discarded
    bootstrapId = -1;
    destroyRef(loadingModuleRef, 'loading', reason);
    loadingModuleRef = null;
    destroyRef(mainModuleRef, 'main', reason);
    mainModuleRef = null;
  };
  const launchCallback = profile('@nativescript/angular/platform-common.launchCallback', (args: LaunchEventData) => {
    launchEventDone = false;
    bootstrapRoot('applaunch');
    launchEventDone = true;
    args.root = targetRootView || null;
  });
  const exitCallback = profile('@nativescript/angular/platform-common.exitCallback', (args: ApplicationEventData) => {
    disposeLastModules('appexit');
  });

  let oldAddEventListener;
  if (typeof Zone !== 'undefined' && global.NativeScriptGlobals?.events?.[Zone.__symbol__('addEventListener')]) {
    oldAddEventListener = global.NativeScriptGlobals.events.addEventListener;
    global.NativeScriptGlobals.events.addEventListener =
      global.NativeScriptGlobals.events[Zone.__symbol__('addEventListener')];
  }
  if (!options.embedded) {
    Application.on(Application.launchEvent, launchCallback);
  }
  Application.on(Application.exitEvent, exitCallback);
  if (oldAddEventListener) {
    global.NativeScriptGlobals.events.addEventListener = oldAddEventListener;
  }

  // Detect HMR environment (webpack or Vite)
  const isWebpackHot = !!import.meta['webpackHot'];
  // import.meta.hot is available when code goes through Vite's transform pipeline.
  // When @nativescript/angular is pre-bundled in the vendor (esbuild), import.meta.hot
  // won't exist. Fall back to the global placeholder flag that the NativeScript Vite
  // HMR runtime sets during dev boot.
  const isViteHot = !!import.meta['hot'] || !!(globalThis as any).__NS_DEV_PLACEHOLDER_ROOT_EARLY__;
  const isHotReloadEnabled = isWebpackHot || isViteHot;

  // Always expose HMR globals for both webpack and Vite HMR support
  // These allow the HMR runtime to properly dispose and re-bootstrap Angular
  global['__dispose_app_ng_platform__'] = () => {
    disposePlatform('hotreload');
  };
  global['__dispose_app_ng_modules__'] = () => {
    disposeLastModules('hotreload');
  };
  global['__bootstrap_app_ng_modules__'] = () => {
    bootstrapRoot('hotreload');
  };
  global['__cleanup_ng_hot__'] = () => {
    Application.off(Application.launchEvent, launchCallback);
    Application.off(Application.exitEvent, exitCallback);
    disposeLastModules('hotreload');
    disposePlatform('hotreload');
  };
  global['__reboot_ng_modules__'] = (shouldDisposePlatform: boolean = false) => {
    console.log('[ng-hmr] __reboot_ng_modules__ called, shouldDisposePlatform:', shouldDisposePlatform);
    console.log('[ng-hmr] current bootstrapId:', bootstrapId, 'mainModuleRef:', !!mainModuleRef);
    disposeLastModules('hotreload');
    console.log('[ng-hmr] after disposeLastModules, bootstrapId:', bootstrapId);
    if (shouldDisposePlatform) {
      disposePlatform('hotreload');
    }
    console.log('[ng-hmr] calling bootstrapRoot...');
    bootstrapRoot('hotreload');
    console.log('[ng-hmr] bootstrapRoot returned, new bootstrapId:', bootstrapId);
  };

  if (isWebpackHot) {
    // Webpack-specific HMR handling
    import.meta['webpackHot'].decline();

    if (!Application.hasLaunched()) {
      Application.run();
      return;
    }
    bootstrapRoot('hotreload');
    return;
  }

  if (isViteHot) {
    // Vite-specific HMR handling
    // Vite HMR is handled by @nativescript/vite's HMR runtime
    // which will call __reboot_ng_modules__ when needed

    if (!Application.hasLaunched()) {
      Application.run();
      return;
    }
    bootstrapRoot('hotreload');
    return;
  }

  if (options.embedded) {
    bootstrapRoot('applaunch');
  } else {
    Application.run();
  }
}
