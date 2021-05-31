import { Injectable, OnDestroy } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class LoadingService implements OnDestroy {
  readyToDestroy$ = new BehaviorSubject(false);
  mainModuleReady$ = new BehaviorSubject(false);

  notifyMainModuleReady() {
    this.mainModuleReady$.next(true);
  }

  notifyReadyToDestroy() {
    this.readyToDestroy$.next(true);
  }
  ngOnDestroy() {
    this.readyToDestroy$.complete();
    this.mainModuleReady$.complete();
  }
}
