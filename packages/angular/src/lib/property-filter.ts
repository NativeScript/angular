import { Inject, InjectionToken } from '@angular/core';
import { DEVICE } from './tokens';
import { Device, platformNames } from '@nativescript/core';

export interface NamespaceFilter {
  runsIn(namespace: string, next: (namespace: string) => boolean | undefined): boolean | undefined;
}

export class PlatformNamespaceFilter implements NamespaceFilter {
  constructor(@Inject(DEVICE) private device: typeof Device) {}
  runsIn(namespace: string, next: (namespace: string) => boolean | undefined): boolean | undefined {
    return (namespace === 'android' && this.device.os === platformNames.android) || (namespace === 'ios' && this.device.os === platformNames.ios) ? next(namespace) : false;
  }
}

export const NAMESPACE_FILTERS = new InjectionToken<NamespaceFilter[]>('NativeScriptNamespaceFilter');
