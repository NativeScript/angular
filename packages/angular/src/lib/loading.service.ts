import { Injectable, OnDestroy } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { filter } from 'rxjs/operators';

@Injectable({ providedIn: 'root' })
export class NativeScriptLoadingService implements OnDestroy {
  private mainModuleReady$ = new BehaviorSubject(false);
  readyToDestroy$ = new BehaviorSubject(true);
  onMainModuleReady$ = this.mainModuleReady$.pipe(filter((ready) => ready));

  /**
   * delays destroying this module until `notifyReadyToDestroy()`.
   * remember to call `notifyReadyToDestroy()` when done!
   */
  waitUntilNotified() {
    this.readyToDestroy$.next(false);
  }

  /**
   * notifies this module is ready to be destroyed
   */
  notifyReadyToDestroy() {
    this.readyToDestroy$.next(true);
  }
  isMainModuleReady() {
    return this.mainModuleReady$.value;
  }
  ngOnDestroy() {
    this.readyToDestroy$.complete();
    this.mainModuleReady$.complete();
  }

  /**
   * This funcion is called by the bootstrap code when the app is ready
   * @internal
   */
  _notifyMainModuleReady() {
    this.mainModuleReady$.next(true);
  }
}
