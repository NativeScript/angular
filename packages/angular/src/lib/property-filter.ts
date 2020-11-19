import { Inject, InjectionToken } from '@angular/core';
import { DEVICE } from './tokens';
import { Device, platformNames } from '@nativescript/core';

export interface NamespaceFilter {
  runsIn(namespace: string, next: (namespace: string) => boolean | undefined): boolean | undefined;
}

export class PlatformNamespaceFilter implements NamespaceFilter {
  constructor(@Inject(DEVICE) private device: typeof Device) {}
  runsIn(namespace: string, next: (namespace: string) => boolean | undefined): boolean | undefined {
    if (namespace === 'android') {
      return this.device.os === platformNames.android;
    }
    if (namespace === 'ios') {
      return this.device.os === platformNames.ios;
    }
    return next(namespace);
  }
}

export const NAMESPACE_FILTERS = new InjectionToken<NamespaceFilter[]>('NativeScriptNamespaceFilter');
