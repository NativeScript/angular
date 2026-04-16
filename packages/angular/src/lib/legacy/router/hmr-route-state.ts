import { Injectable, OnDestroy } from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';
import { Subscription } from 'rxjs';

import {
  installAngularHmrRouteCaptureHook,
  readAngularHmrPendingStartPath,
  writeAngularHmrRouteState,
} from './hmr-route-state-core';

export { captureAngularHmrPendingStartPath, invokeAngularHmrRouteCapture, normalizeAngularHmrRouteUrl } from './hmr-route-state-core';
export { readAngularHmrPendingStartPath } from './hmr-route-state-core';

@Injectable()
export class NativeScriptAngularHmrRouteTracker implements OnDestroy {
  private subscription?: Subscription;
  private disposeCaptureHook?: () => void;

  constructor(private readonly router: Router) {
    if (!this.isHmrEnabled()) {
      return;
    }

    this.disposeCaptureHook = this.installCaptureHook();
    this.captureCurrentRoute('bootstrap');
    this.subscription = this.router.events.subscribe((event) => {
      if (event instanceof NavigationEnd) {
        writeAngularHmrRouteState(event.urlAfterRedirects || event.url, {
          source: 'navigation-end',
        });
      }
    });
  }

  ngOnDestroy(): void {
    this.subscription?.unsubscribe();
    this.disposeCaptureHook?.();
  }

  private captureCurrentRoute(source: string): string | null {
    return writeAngularHmrRouteState(this.router.url, {
      pending: source === 'hmr-reboot',
      source,
    });
  }

  private installCaptureHook(): () => void {
    return installAngularHmrRouteCaptureHook(() => this.captureCurrentRoute('hmr-reboot'));
  }

  private isHmrEnabled(): boolean {
    const g = globalThis as any;
    return !!g.__NS_DEV_PLACEHOLDER_ROOT_EARLY__ || typeof g.__reboot_ng_modules__ === 'function';
  }
}