import { Injectable, InjectionToken, Provider, reflectComponentType } from "@angular/core";
import { Router, RouterOutlet } from "@angular/router";
import { PageRouterOutlet } from "@nativescript/angular";
import { combineLatest, of, Subscription, switchMap } from "rxjs";
import { NativeScriptDebug } from "../trace";

export const INPUT_BINDER = new InjectionToken<RoutedComponentInputBinder>('');
/**
 * Injectable used as a tree-shakable provider for opting in to binding router data to component
 * inputs.
 *
 * The RouterOutlet registers itself with this service when an `ActivatedRoute` is attached or
 * activated. When this happens, the service subscribes to the `ActivatedRoute` observables (params,
 * queryParams, data) and sets the inputs of the component using `ComponentRef.setInput`.
 * Importantly, when an input does not have an item in the route data with a matching key, this
 * input is set to `undefined`. If it were not done this way, the previous information would be
 * retained if the data got removed from the route (i.e. if a query parameter is removed).
 *
 * The `RouterOutlet` should unregister itself when destroyed via `unsubscribeFromRouteData` so that
 * the subscriptions are cleaned up.
 */
@Injectable()
export class RoutedComponentInputBinder {
  private outletDataSubscriptions = new Map<PageRouterOutlet, Subscription>;

  bindActivatedRouteToOutletComponent(outlet: PageRouterOutlet): void {
    this.unsubscribeFromRouteData(outlet);
    this.subscribeToRouteData(outlet);
  }

  unsubscribeFromRouteData(outlet: PageRouterOutlet): void {
    this.outletDataSubscriptions.get(outlet)?.unsubscribe();
    this.outletDataSubscriptions.delete(outlet);
  }

  private subscribeToRouteData(outlet: PageRouterOutlet) {

    const { activatedRoute } = outlet;

    if (!activatedRoute) {
        if (NativeScriptDebug.isLogEnabled()) {
          NativeScriptDebug.routerLog('Outlet is not activatedA');
        }
        return;
    }

    const dataSubscription =
      combineLatest([
        activatedRoute.queryParams,
        activatedRoute.params,
        activatedRoute.data,
      ])
        .pipe(switchMap(([queryParams, params, data], index) => {
          data = { ...queryParams, ...params, ...data };
          // Get the first result from the data subscription synchronously so it's available to
          // the component as soon as possible (and doesn't require a second change detection).
          if (index === 0) {
            return of(data);
          }
          // Promise.resolve is used to avoid synchronously writing the wrong data when
          // two of the Observables in the `combineLatest` stream emit one after
          // another.
          return Promise.resolve(data);
        }))
        .subscribe(data => {
          // Outlet may have been deactivated or changed names to be associated with a different
          // route
          if (!outlet.isActivated || !outlet.activatedComponentRef ||
            outlet.activatedRoute !== activatedRoute || activatedRoute.component === null) {
            this.unsubscribeFromRouteData(outlet);
            return;
          }

          const mirror = reflectComponentType(activatedRoute.component);
          if (!mirror) {
            this.unsubscribeFromRouteData(outlet);
            return;
          }

          for (const { templateName } of mirror.inputs) {
            outlet.activatedComponentRef.setInput(templateName, data[templateName]);
          }
        });

    this.outletDataSubscriptions.set(outlet, dataSubscription);
  }
}

/**
 * Enables binding information from the `Router` state directly to the inputs of the component in
 * `Route` configurations.
 *
 */
export function withComponentInputBinding(): {
  ɵkind: number;
  ɵproviders: Provider[];
} {
  const providers = [
    RoutedComponentInputBinder,
    { provide: INPUT_BINDER, useExisting: RoutedComponentInputBinder },
  ];

  return {
    ɵkind: RouterFeatureKind.ComponentInputBindingFeature,
    ɵproviders: providers
  }
}

/**
 * The list of features as an enum to uniquely type each feature.
 */
export const enum RouterFeatureKind {
    PreloadingFeature,
    DebugTracingFeature,
    EnabledBlockingInitialNavigationFeature,
    DisabledInitialNavigationFeature,
    InMemoryScrollingFeature,
    RouterConfigurationFeature,
    RouterHashLocationFeature,
    NavigationErrorHandlerFeature,
    ComponentInputBindingFeature,
  }