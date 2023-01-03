import { Inject, Injectable, Optional } from '@angular/core';
import { LocationChangeListener, PlatformLocation } from '@angular/common';
import { START_PATH } from '../tokens';
import { NativeScriptDebug } from '../trace';

@Injectable()
export class NativescriptPlatformLocation extends PlatformLocation {
  private _pathname;

  constructor(@Inject(START_PATH) private startPath: any) {
    super();
    if (NativeScriptDebug.enabled) {
      NativeScriptDebug.routerLog('NativescriptPlatformLocation.constructor');
    }
    console.log(startPath);
    if (this.startPath) {
      if (this.startPath instanceof Promise) {
        this.startPath.then((v) => (this._pathname = this._pathname === undefined ? v : this._pathname));
      } else {
        this._pathname = this.startPath;
      }
    }
  }

  popStateCallbacks: LocationChangeListener[] = [];
  getBaseHrefFromDOM(): string {
    return '/';
  }
  getState(): unknown {
    throw new Error('Method not implemented.');
  }
  onPopState(fn: LocationChangeListener): VoidFunction {
    if (NativeScriptDebug.enabled) {
      NativeScriptDebug.routerLog('NativescriptPlatformLocation.onPopState');
    }
    this.popStateCallbacks.push(fn);
    return () => {
      const index = this.popStateCallbacks.indexOf(fn);

      if (index !== -1) {
        this.popStateCallbacks.splice(index, 1);
      }
    };
    // throw new Error("Method not implemented.");
  }
  onHashChange(fn: LocationChangeListener): VoidFunction {
    if (NativeScriptDebug.enabled) {
      NativeScriptDebug.routerLog('NativescriptPlatformLocation.onHashChange');
    }
    return () => {
      //
    };
    // throw new Error("Method not implemented.");
  }
  get href(): string {
    throw new Error('Method not implemented.');
  }
  get protocol(): string {
    throw new Error('Method not implemented.');
  }
  get hostname(): string {
    throw new Error('Method not implemented.');
  }
  get port(): string {
    return '';
  }
  get pathname(): string {
    if (this._pathname === undefined) {
      this._pathname = '';
    }
    console.log('pathname', this._pathname);
    return this._pathname;
  }
  get search(): string {
    return '';
  }
  get hash(): string {
    return '';
  }
  replaceState(state: any, title: string, url: string): void {
    if (NativeScriptDebug.enabled) {
      NativeScriptDebug.routerLog(`NativescriptPlatformLocation.replaceState ${state} ${title} ${url}`);
    }
    this.popStateCallbacks.forEach((v) => v({ state: null, type: 'forward' }));
  }
  pushState(state: any, title: string, url: string): void {
    if (NativeScriptDebug.enabled) {
      NativeScriptDebug.routerLog(`NativescriptPlatformLocation.pushState ${state} ${title} ${url}`);
    }
  }
  forward(): void {
    throw new Error('Method not implemented.');
  }
  back(): void {
    throw new Error('Method not implemented.');
  }
}
