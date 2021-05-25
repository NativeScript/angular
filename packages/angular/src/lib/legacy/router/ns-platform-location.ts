import { NSLocationStrategy } from './ns-location-strategy';
import { PlatformLocation, LocationChangeListener } from '@angular/common';
import { Injectable } from '@angular/core';
import { NativeScriptDebug } from '../../trace';

@Injectable()
export class NativescriptPlatformLocation extends PlatformLocation {
  constructor(private locationStrategy: NSLocationStrategy) {
    super();
    if (NativeScriptDebug.isLogEnabled()) {
      NativeScriptDebug.routerLog('NativescriptPlatformLocation.constructor()');
    }
  }

  getState(): any {
    return undefined;
  }

  readonly hostname: string;
  readonly href: string;
  readonly port: string;
  readonly protocol: string;

  getBaseHrefFromDOM(): string {
    return '/';
  }

  onPopState(fn: LocationChangeListener): VoidFunction {
    this.locationStrategy.onPopState(fn);
    return () => {};
  }

  onHashChange(_fn: LocationChangeListener): VoidFunction {
    return () => {};
  }

  get search(): string {
    return '';
  }
  get hash(): string {
    return '';
  }
  get pathname(): string {
    return this.locationStrategy.path();
  }
  set pathname(_newPath: string) {
    throw new Error('NativescriptPlatformLocation set pathname - not implemented');
  }

  pushState(state: any, title: string, url: string): void {
    this.locationStrategy.pushState(state, title, url, null);
  }

  replaceState(state: any, title: string, url: string): void {
    this.locationStrategy.replaceState(state, title, url, null);
  }

  forward(): void {
    throw new Error('NativescriptPlatformLocation.forward() - not implemented');
  }

  back(): void {
    this.locationStrategy.back();
  }
}
