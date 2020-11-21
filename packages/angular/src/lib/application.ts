import { NgModuleRef } from '@angular/core';
import { Application, ApplicationEventData, Color, LaunchEventData, LayoutBase, profile, StackLayout, View } from "@nativescript/core";
import { AppHostAsyncView, AppHostView } from './app-host-view';
import { LoadingService } from './loading.service';
import { APP_ROOT_VIEW } from './tokens';
import { filter, take} from "rxjs/operators";

export interface AppLaunchView extends LayoutBase {
	// called when the animation is to begin
	startAnimation?: () => void;
	// called when bootstrap is complete and cleanup can begin
	// should resolve when animation is completely finished
	cleanup?: () => Promise<any>;
}

export interface AppRunOptions<T,K> {
    appModuleBootstrap: () => Promise<NgModuleRef<T>>;
    loadingModule?: () => Promise<NgModuleRef<K>>;
    launchView?: () => AppLaunchView;
}

export function runNativescriptAngularApp<T, K>(options: AppRunOptions<T, K>) {
    let mainModuleRef = null;
    let loadingModuleRef: NgModuleRef<K>;
    const setRootView = (ref: NgModuleRef<T | K> | View) => {
        // TODO: check for leaks when root view isn't properly destroyed
        if(ref instanceof View) {
            Application.resetRootView({
                create: () => ref
            });
            return;
        }
        const view = ref.injector.get(APP_ROOT_VIEW) as AppHostView;
        Application.resetRootView({
            create: () => view.content
        });
    }
    const bootstrapRoot = () => {
        let bootstrapped = false;
        let onMainBootstrap = () => {
            //
        }
        options.appModuleBootstrap().then((ref) => {
            mainModuleRef = ref;
            bootstrapped = true;
            onMainBootstrap();
            // bootstrapped component: (ref as any)._bootstrapComponents[0];
        });
        // TODO: scheduleMacroTask
        setTimeout(() => {
            if(bootstrapped) {
                setRootView(mainModuleRef);
            } else {
                if(options.loadingModule) {
                    options.loadingModule().then((loadingRef) => {
                        loadingModuleRef = loadingRef;
                        setRootView(loadingRef);
                        onMainBootstrap = () => {
                            const loadingService = loadingModuleRef.injector.get(LoadingService);
                            loadingService.notifyMainModuleReady();
                            loadingService.readyToDestroy$.pipe(filter((ready) => ready), take(1)).subscribe(() => {
                                loadingModuleRef.destroy();
                                loadingModuleRef = null;
                                setRootView(mainModuleRef);
                            });
                        }
                    })
                } else if(options.launchView) {
                    let launchView = options.launchView();
                    setRootView(launchView);
                    if(launchView.startAnimation) {
                        setTimeout(() => {
                            // ensure launch animation is executed after launchView added to view stack
                            launchView.startAnimation();
                        });
                    }
                    onMainBootstrap = () => {
                        if(launchView.cleanup) {
                            launchView.cleanup().then(() => {
                                launchView = null;
                                setRootView(mainModuleRef);
							});
                        }
                    }
                }
            }
        }, 0);
    }
    const disposeLastModules = () => {
        if(loadingModuleRef) {
            mainModuleRef.destroy();
            mainModuleRef = null;
        }
        if(mainModuleRef) {
            mainModuleRef.destroy();
            mainModuleRef = null;
        }
    }
    const launchCallback = profile('@nativescript/angular/platform-common.launchCallback', (args: LaunchEventData) => {
        args.root = null;
        args.root = new StackLayout();
        bootstrapRoot();
    });
    const exitCallback = profile('@nativescript/angular/platform-common.exitCallback', (args: ApplicationEventData) => {
        disposeLastModules();
    });
    if((module as any).hot) {
        (<any>global).__onLiveSyncCore = () => {
            bootstrapRoot();
        };
    }
    Application.on(Application.launchEvent, launchCallback);
	Application.on(Application.exitEvent, exitCallback);
    Application.run();
}
