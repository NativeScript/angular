import {
  EnvironmentProviders,
  inject,
  Injector,
  makeEnvironmentProviders,
  Provider,
  Type,
  ɵresetCompiledComponents,
} from '@angular/core';
import {
  NavigationCancel,
  NavigationEnd,
  NavigationError,
  NavigationSkipped,
  Router,
  RouteReuseStrategy,
} from '@angular/router';
import { Application } from '@nativescript/core';
import { firstValueFrom } from 'rxjs';
import { filter } from 'rxjs/operators';
import { rebootHmrAppInPlace } from '../application';
import { NativeDialog } from '../cdk/dialog/dialog-services';
import { NATIVESCRIPT_HMR_PARTICIPANTS, NativeScriptHmrParticipant, START_PATH } from '../tokens';
import { configureHmrCache, hmrCacheStore } from './cache';
import { createDialogParticipant, registeredHmrComponentClasses, registerHmrComponentClass } from './dialog-restore';
import { defineAngularHmrCompatGlobals } from './globals';
import type { HmrCacheOptions } from './lru-store';
import {
  beginRouteRestoreBoot,
  createRouteParticipant,
  getAngularHmrRestoringRoute,
  ROUTE_PARTICIPANT_KEY,
  ROUTE_PARTICIPANT_VERSION,
} from './route-restore';

export interface NativeScriptHmrCompatOptions {
  /** Boot the rebooted app at the previous URL. Default `true`. */
  route?: boolean;
  /**
   * Destroys the detached routes of the app's `RouteReuseStrategy` before a reboot. Needed only for
   * a strategy without a `clearAllCaches()` method, which is called otherwise.
   */
  clearRouteReuseStrategy?: (strategy: RouteReuseStrategy) => void;
  /** Reopen component dialogs opened with `preserveOnHmr: true`. Default `true`. */
  dialogs?: boolean;
  /**
   * Components of dialogs opened with `preserveOnHmr`. A dialog reopens with the listed class of the
   * same name, so an edited dialog component reopens with its new code; unlisted dialogs reopen with
   * the class they were opened with.
   */
  dialogComponents?: readonly Type<unknown>[];
  /** Options of the `HmrCacheService` cache. */
  cache?: HmrCacheOptions;
  /** Define the deprecated HMR globals (see `installAngularHmrCompatGlobals`). Default `true`. */
  globals?: boolean;
}

const ROOT_VIEW_WAIT_MS = 2000;

function logHmrCompat(message: string, error?: unknown): void {
  if (error === undefined) {
    console.warn(`[@nativescript/angular] ${message}`);
  } else {
    console.error(`[@nativescript/angular] ${message}`, error);
  }
}

/**
 * Experimental: the HMR conveniences of the earlier `@nativescript/vite` Angular integration,
 * rebuilt as HMR participants. In a Vite dev session it restores the route and the dialogs opened
 * with `preserveOnHmr` across HMR reboots and defines the deprecated HMR globals. Outside one it
 * only applies the `cache` options.
 *
 * List it after any `START_PATH` provider: while a route restore is pending it provides
 * `START_PATH` itself, so the rebooted app starts at the previous URL.
 */
export function provideNativeScriptHmrCompat(options: NativeScriptHmrCompatOptions = {}): EnvironmentProviders {
  if (options.cache) {
    configureHmrCache(options.cache);
  }
  // Literal `import.meta.hot`: webpack folds it to `false`, which leaves the dev-only code unused.
  if (!(import.meta as ImportMeta & { hot?: unknown }).hot) {
    return makeEnvironmentProviders([]);
  }
  if (options.globals !== false) {
    installAngularHmrCompatGlobals();
  }
  const providers: Provider[] = [];
  if (options.route !== false) {
    providers.push({
      provide: NATIVESCRIPT_HMR_PARTICIPANTS,
      multi: true,
      useFactory: () => routeParticipant(options),
    });
    const bootUrl = beginRouteRestoreBoot();
    if (bootUrl !== undefined) {
      providers.push({ provide: START_PATH, useValue: bootUrl });
    }
  }
  if (options.dialogs !== false) {
    providers.push({
      provide: NATIVESCRIPT_HMR_PARTICIPANTS,
      multi: true,
      useFactory: () => dialogParticipant(options),
    });
  }
  return makeEnvironmentProviders(providers);
}

function routeParticipant(options: NativeScriptHmrCompatOptions): NativeScriptHmrParticipant {
  const injector = inject(Injector);
  // A factory that throws empties the whole participant list, so a router that can't be built only disables this one.
  let router: Router;
  try {
    router = inject(Router);
  } catch (error) {
    logHmrCompat('The router is unavailable; route restore is disabled.', error);
    return {
      key: ROUTE_PARTICIPANT_KEY,
      version: ROUTE_PARTICIPANT_VERSION,
      save: () => null,
      restore: () => undefined,
    };
  }
  return createRouteParticipant({
    router,
    clearRouteReuseCache: () => {
      const strategy = injector.get(RouteReuseStrategy, null);
      if (!strategy) {
        return;
      }
      if (options.clearRouteReuseStrategy) {
        options.clearRouteReuseStrategy(strategy);
      } else {
        (strategy as RouteReuseStrategy & { clearAllCaches?: () => void }).clearAllCaches?.();
      }
    },
    whenNavigationSettled: async () => {
      if (!router.currentNavigation()) {
        return;
      }
      await firstValueFrom(
        router.events.pipe(
          filter(
            (e) =>
              e instanceof NavigationEnd ||
              e instanceof NavigationCancel ||
              e instanceof NavigationError ||
              e instanceof NavigationSkipped,
          ),
        ),
      );
    },
    log: logHmrCompat,
  });
}

function dialogParticipant(options: NativeScriptHmrCompatOptions): NativeScriptHmrParticipant {
  const injector = inject(Injector);
  return createDialogParticipant({
    openDialogs: () => {
      // NativeDialog requires the NativeScript router; an app without one has no dialogs to keep.
      try {
        return injector.get(NativeDialog).openDialogs;
      } catch {
        return [];
      }
    },
    open: (component, config) => {
      injector.get(NativeDialog).open(component, config);
    },
    whenRootViewLoaded,
    dialogComponents: options.dialogComponents ?? [],
    log: logHmrCompat,
  });
}

function whenRootViewLoaded(): Promise<boolean> {
  return new Promise((resolve) => {
    const started = Date.now();
    const check = () => {
      if (Application.getRootView()?.isLoaded) {
        // Let the new root finish attaching before presenting on top of it.
        setTimeout(() => resolve(true));
      } else if (Date.now() - started < ROOT_VIEW_WAIT_MS) {
        setTimeout(check, 16);
      } else {
        resolve(false);
      }
    };
    check();
  });
}

/**
 * Deprecated: defines the HMR globals of the earlier `@nativescript/vite` Angular integration on
 * `globalThis`, each forwarding to its replacement (or doing nothing when there is none) and
 * warning once. Only in a Vite dev session; `provideNativeScriptHmrCompat()` calls it unless
 * `globals: false`. Call it yourself only if app code reads a global before the providers run.
 */
export function installAngularHmrCompatGlobals(): void {
  if (!(import.meta as ImportMeta & { hot?: unknown }).hot) {
    return;
  }
  defineAngularHmrCompatGlobals(globalThis, {
    resetCompiledComponents: () => ɵresetCompiledComponents(),
    rebootInPlace: rebootHmrAppInPlace,
    registerComponent: registerHmrComponentClass,
    legacyState: () => ({
      route: { restoring: getAngularHmrRestoringRoute() ?? undefined },
      components: new Map(registeredHmrComponentClasses()),
      cache: hmrCacheStore().snapshot(),
      dialogs: [],
      hooks: new Map(),
    }),
  });
}
