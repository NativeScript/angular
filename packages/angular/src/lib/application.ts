import { NgModuleRef, NgZone, PlatformRef } from '@angular/core';
import { filter, map, take } from 'rxjs/operators';
import { Application, ApplicationEventData, Color, LaunchEventData, LayoutBase, profile, removeTaggedAdditionalCSS, StackLayout, TextView, View, Utils, Trace } from '@nativescript/core';
import { AppHostView } from './app-host-view';
import { NativeScriptLoadingService } from './loading.service';
import { APP_ROOT_VIEW, DISABLE_ROOT_VIEW_HANDLING, NATIVESCRIPT_ROOT_MODULE_ID } from './tokens';
import { Observable, Subject } from 'rxjs';
import { NativeScriptDebug } from './trace';

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
      reference: NgModuleRef<unknown>;
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
  map((v) => v.reference as NgModuleRef<any>)
);
/**
 * @deprecated
 */
export const onAfterLivesync: Observable<{
  moduleRef?: NgModuleRef<any>;
  error?: Error;
}> = postAngularBootstrap$.pipe(
  filter((v) => v.moduleType === 'main'),
  map((v) => ({ moduleRef: v.reference as NgModuleRef<any> }))
);
export interface AppRunOptions<T, K> {
  appModuleBootstrap: (reason: NgModuleReason) => Promise<NgModuleRef<T>>;
  loadingModule?: (reason: NgModuleReason) => Promise<NgModuleRef<K>>;
  launchView?: (reason: NgModuleReason) => AppLaunchView;
}

if (import.meta['webpackHot']) {
  import.meta['webpackHot'].decline();
  global.__onLiveSyncCore = () => {
    Application.getRootView()?._onCssStateChange();
    // all other changes are applied by runNativeScriptAngularApp
  };
}

function emitModuleBootstrapEvent<T>(ref: NgModuleRef<T>, name: 'main' | 'loading', reason: NgModuleReason) {
  postAngularBootstrap$.next({
    moduleType: name,
    reference: ref,
    reason,
  });
}

function destroyRef<T>(ref: NgModuleRef<T>, name: 'main' | 'loading', reason: NgModuleReason): void;
function destroyRef(ref: PlatformRef, reason: NgModuleReason): void;
function destroyRef<T>(ref: PlatformRef | NgModuleRef<T>, name?: string, reason?: string): void {
  if (ref) {
    if (ref instanceof PlatformRef) {
      preAngularDisposal$.next({
        moduleType: 'platform',
        reference: ref,
        reason: name,
      });
    }
    if (ref instanceof NgModuleRef) {
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
    () => {},
    () => {}
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

export function runNativeScriptAngularApp<T, K>(options: AppRunOptions<T, K>) {
  let mainModuleRef: NgModuleRef<T> = null;
  let loadingModuleRef: NgModuleRef<K>;
  let platformRef: PlatformRef = null;
  let bootstrapId = -1;
  const updatePlatformRef = (moduleRef: NgModuleRef<T | K>, reason: NgModuleReason) => {
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
  const setRootView = (ref: NgModuleRef<T | K> | View) => {
    if (bootstrapId === -1) {
      // treat edge cases
      return;
    }
    if (ref instanceof NgModuleRef) {
      if (ref.injector.get(DISABLE_ROOT_VIEW_HANDLING, false)) {
        return;
      }
    } else {
      if (ref['__disable_root_view_handling']) {
        return;
      }
    }
    Application.getRootView()?._closeAllModalViewsInternal(); // cleanup old rootview
    NativeScriptDebug.bootstrapLog(`Setting RootView ${launchEventDone ? 'outside of' : 'during'} launch event`);
    // TODO: check for leaks when root view isn't properly destroyed
    if (ref instanceof View) {
      if (NativeScriptDebug.isLogEnabled()) {
        NativeScriptDebug.bootstrapLog(`Setting RootView to ${ref}`);
      }
      if (launchEventDone) {
        Application.resetRootView({
          create: () => ref,
        });
      } else {
        targetRootView = ref;
      }
      return;
    }
    const view = ref.injector.get(APP_ROOT_VIEW) as AppHostView | View;
    const newRoot = view instanceof AppHostView ? view.content : view;
    if (NativeScriptDebug.isLogEnabled()) {
      NativeScriptDebug.bootstrapLog(`Setting RootView to ${newRoot}`);
    }
    if (launchEventDone) {
      Application.resetRootView({
        create: () => newRoot,
      });
    } else {
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
    try {
      bootstrapId = Date.now();
      const currentBootstrapId = bootstrapId;
      let bootstrapped = false;
      let onMainBootstrap = () => {
        setRootView(mainModuleRef);
      };
      runSynchronously(
        () =>
          options.appModuleBootstrap(reason).then(
            (ref) => {
              if (currentBootstrapId !== bootstrapId) {
                // this module is old and not needed anymore
                // this may happen when developer uses async app initializer and the user exits the app before this bootstraps
                ref.destroy();
                return;
              }
              mainModuleRef = ref;
              ref.onDestroy(() => (mainModuleRef = mainModuleRef === ref ? null : mainModuleRef));
              updatePlatformRef(ref, reason);
              const styleTag = ref.injector.get(NATIVESCRIPT_ROOT_MODULE_ID);
              ref.onDestroy(() => {
                removeTaggedAdditionalCSS(styleTag);
              });
              bootstrapped = true;
              onMainBootstrap();
              emitModuleBootstrapEvent(ref, 'main', reason);
              // bootstrapped component: (ref as any)._bootstrapComponents[0];
            },
            (err) => {
              bootstrapped = true;
              NativeScriptDebug.bootstrapLogError(`Error bootstrapping app module:\n${err.message}\n\n${err.stack}`);
              showErrorUI(err);
              throw err;
            }
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
                    loadingModuleRef.onDestroy(() => (loadingModuleRef = loadingModuleRef === loadingRef ? null : loadingModuleRef));
                    updatePlatformRef(loadingRef, reason);
                    const styleTag = loadingModuleRef.injector.get(NATIVESCRIPT_ROOT_MODULE_ID);
                    loadingRef.onDestroy(() => {
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
                            take(1)
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
                    NativeScriptDebug.bootstrapLogError(`Error bootstrapping loading module:\n${err.message}\n\n${err.stack}`);
                    showErrorUI(err);
                    throw err;
                  }
                )
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
              console.warn('App is bootstrapping asynchronously (likely APP_INITIALIZER) but did not provide a launchView or LoadingModule.');
            }
          }
        }
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
    global.NativeScriptGlobals.events.addEventListener = global.NativeScriptGlobals.events[Zone.__symbol__('addEventListener')];
  }
  Application.on(Application.launchEvent, launchCallback);
  Application.on(Application.exitEvent, exitCallback);
  if (oldAddEventListener) {
    global.NativeScriptGlobals.events.addEventListener = oldAddEventListener;
  }
  if (import.meta['webpackHot']) {
    // handle HMR Application.run
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
      disposeLastModules('hotreload');
      if (shouldDisposePlatform) {
        disposePlatform('hotreload');
      }
      bootstrapRoot('hotreload');
    };

    if (!Application.hasLaunched()) {
      Application.run();
      return;
    }
    bootstrapRoot('hotreload');
    return;
  }

  Application.run();
}
