import { NgModuleRef, PlatformRef } from '@angular/core';
import { Application, ApplicationEventData, Color, LaunchEventData, LayoutBase, profile, removeTaggedAdditionalCSS, StackLayout, TextView, View } from '@nativescript/core';
import { AppHostAsyncView, AppHostView } from './app-host-view';
import { LoadingService } from './loading.service';
import { APP_RENDERED_ROOT_VIEW, APP_ROOT_VIEW, NATIVESCRIPT_ROOT_MODULE_ID } from './tokens';
import { filter, take } from 'rxjs/operators';
import { Utils } from '@nativescript/core';

export interface AppLaunchView extends LayoutBase {
  // called when the animation is to begin
  startAnimation?: () => void;
  // called when bootstrap is complete and cleanup can begin
  // should resolve when animation is completely finished
  cleanup?: () => Promise<any>;
}

export interface AppRunOptions<T, K> {
  appModuleBootstrap: () => Promise<NgModuleRef<T>>;
  loadingModule?: () => Promise<NgModuleRef<K>>;
  launchView?: () => AppLaunchView;
}

export function runNativescriptAngularApp<T, K>(options: AppRunOptions<T, K>) {
  let mainModuleRef = null;
  let loadingModuleRef: NgModuleRef<K>;
  let platformRef: PlatformRef = null;
  const updatePlatformRef = (moduleRef: NgModuleRef<any>) => {
    const newPlatformRef = moduleRef.injector.get(PlatformRef);
    if (newPlatformRef === platformRef) {
      return;
    }
    if (platformRef) {
      platformRef.destroy();
    }
    platformRef = newPlatformRef;
    platformRef.onDestroy(() => (platformRef = platformRef === newPlatformRef ? null : platformRef));
  };
  const setRootView = (ref: NgModuleRef<T | K> | View) => {
    // TODO: check for leaks when root view isn't properly destroyed
    if (ref instanceof View) {
      Application.resetRootView({
        create: () => ref,
      });
      return;
    }
    const view = ref.injector.get(APP_RENDERED_ROOT_VIEW) as AppHostView | View;
    const newRoot = view instanceof AppHostView ? view.content : view;
    Application.resetRootView({
      create: () => newRoot,
    });
  };
  const showErrorUI = (error: Error) => {
    const message = error.message + '\n\n' + error.stack;
    const errorTextBox = new TextView();
    errorTextBox.text = message;
    errorTextBox.color = new Color('red');
    setRootView(errorTextBox);
  };
  const bootstrapRoot = () => {
    let bootstrapped = false;
    let onMainBootstrap = () => {
      //
    };
    options.appModuleBootstrap().then(
      (ref) => {
        mainModuleRef = ref;
        ref.onDestroy(() => (mainModuleRef = mainModuleRef === ref ? null : mainModuleRef));
        updatePlatformRef(ref);
        const styleTag = ref.injector.get(NATIVESCRIPT_ROOT_MODULE_ID);
        ref.onDestroy(() => {
          removeTaggedAdditionalCSS(styleTag);
        });
        bootstrapped = true;
        onMainBootstrap();
        // bootstrapped component: (ref as any)._bootstrapComponents[0];
      },
      (err) => showErrorUI(err)
    );
    // TODO: scheduleMacroTask
    (<any>Utils).queueMacrotask(() => {
      if (bootstrapped) {
        setRootView(mainModuleRef);
      } else {
        if (options.loadingModule) {
          options.loadingModule().then(
            (loadingRef) => {
              loadingModuleRef = loadingRef;
              loadingModuleRef.onDestroy(() => (loadingModuleRef = loadingModuleRef === loadingRef ? null : loadingModuleRef));
              updatePlatformRef(loadingRef);
              const styleTag = loadingModuleRef.injector.get(NATIVESCRIPT_ROOT_MODULE_ID);
              loadingRef.onDestroy(() => {
                removeTaggedAdditionalCSS(styleTag);
              });
              setRootView(loadingRef);
              onMainBootstrap = () => {
                const loadingService = loadingModuleRef.injector.get(LoadingService);
                loadingService.notifyMainModuleReady();
                loadingService.readyToDestroy$
                  .pipe(
                    filter((ready) => ready),
                    take(1)
                  )
                  .subscribe(() => {
                    loadingModuleRef.destroy();
                    loadingModuleRef = null;
                    setRootView(mainModuleRef);
                  });
              };
            },
            (err) => showErrorUI(err)
          );
        } else if (options.launchView) {
          let launchView = options.launchView();
          setRootView(launchView);
          if (launchView.startAnimation) {
            setTimeout(() => {
              // ensure launch animation is executed after launchView added to view stack
              launchView.startAnimation();
            });
          }
          onMainBootstrap = () => {
            if (launchView.cleanup) {
              launchView
                .cleanup()
                .catch()
                .then(() => {
                  launchView = null;
                  setRootView(mainModuleRef);
                });
            }
          };
        }
      }
    });
  };
  const disposePlatform = () => {
    if (platformRef) {
      platformRef.destroy();
      platformRef = null;
    }
  };
  const disposeLastModules = () => {
    if (loadingModuleRef) {
      loadingModuleRef.destroy();
      loadingModuleRef = null;
    }
    if (mainModuleRef) {
      mainModuleRef.destroy();
      mainModuleRef = null;
    }
  };
  const launchCallback = profile('@nativescript/angular/platform-common.launchCallback', (args: LaunchEventData) => {
    args.root = null;
    bootstrapRoot();
  });
  const exitCallback = profile('@nativescript/angular/platform-common.exitCallback', (args: ApplicationEventData) => {
    disposeLastModules();
  });
  if (module['hot']) {
    global['__dispose_app_ng_platform__'] = () => {
      disposePlatform();
    };
    global['__dispose_app_ng_modules__'] = () => {
      disposeLastModules();
    };
    global['__bootstrap_app_ng_modules__'] = () => {
      bootstrapRoot();
    };
    global['__reboot_ng_modules__'] = () => {
      global['__dispose_app_ng_platform__']();
      global['__dispose_app_ng_modules__']();
      global['__bootstrap_app_ng_modules__']();
    };
  }
  Application.on(Application.launchEvent, launchCallback);
  Application.on(Application.exitEvent, exitCallback);
  Application.run();
}
