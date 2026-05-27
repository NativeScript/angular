import { Injectable, InjectionToken, reflectComponentType } from '@angular/core';
import { combineLatest, of, Subscription } from 'rxjs';
import { switchMap } from 'rxjs/operators';
import type { PageRouterOutlet } from './page-router-outlet';

export interface ComponentInputBindingOptions {
  queryParams?: boolean;
  unmatchedInputBehavior?: 'alwaysUndefined' | 'undefinedIfStale';
}

export const INPUT_BINDER = new InjectionToken<RoutedComponentInputBinder>('RoutedComponentInputBinder');

@Injectable()
export class RoutedComponentInputBinder {
  private outletDataSubscriptions = new Map<PageRouterOutlet, Subscription>();
  private outletSeenKeys = new Map<PageRouterOutlet, Set<string>>();

  constructor(private options: ComponentInputBindingOptions) {
    this.options.queryParams ??= true;
  }

  bindActivatedRouteToOutletComponent(outlet: PageRouterOutlet): void {
    this.unsubscribeFromRouteData(outlet);
    this.subscribeToRouteData(outlet);
  }

  unsubscribeFromRouteData(outlet: PageRouterOutlet): void {
    this.outletDataSubscriptions.get(outlet)?.unsubscribe();
    this.outletDataSubscriptions.delete(outlet);
    this.outletSeenKeys.delete(outlet);
  }

  private subscribeToRouteData(outlet: PageRouterOutlet) {
    const { activatedRoute } = outlet;
    const dataSubscription = combineLatest([this.options.queryParams ? activatedRoute.queryParams : of({}), activatedRoute.params, activatedRoute.data])
      .pipe(
        switchMap(([queryParams, params, data], index) => {
          data = { ...queryParams, ...params, ...data };
          if (index === 0) {
            return of(data);
          }
          return Promise.resolve(data);
        }),
      )
      .subscribe((data) => {
        if (!outlet.isActivated || !outlet.activatedComponentRef || outlet.activatedRoute !== activatedRoute || activatedRoute.component === null) {
          this.unsubscribeFromRouteData(outlet);
          return;
        }

        const mirror = reflectComponentType(activatedRoute.component);
        if (!mirror) {
          this.unsubscribeFromRouteData(outlet);
          return;
        }

        let seenKeys = this.outletSeenKeys.get(outlet);
        if (!seenKeys) {
          seenKeys = new Set<string>();
          this.outletSeenKeys.set(outlet, seenKeys);
        }

        for (const key of Object.keys(data)) {
          seenKeys.add(key);
        }

        const behavior = this.options.unmatchedInputBehavior ?? 'alwaysUndefined';

        for (const { templateName } of mirror.inputs) {
          const value = data[templateName];
          if (value !== undefined || behavior === 'alwaysUndefined' || seenKeys.has(templateName)) {
            outlet.activatedComponentRef.setInput(templateName, value);
          }
        }
      });

    this.outletDataSubscriptions.set(outlet, dataSubscription);
  }
}
