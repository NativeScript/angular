import { CompilerOptions, Injector, NgModuleRef, NgZone, PlatformRef, Type } from '@angular/core';
import { ɵNgModuleFactory as NgModuleFactory } from '@angular/core';
import { AppLaunchView, AppRunOptions, runNativeScriptAngularApp } from './application';

/**
 * Provides additional options to the bootstraping process.
 *
 *
 */
export interface BootstrapOptions {
  /**
   * Optionally specify which `NgZone` should be used.
   *
   * - Provide your own `NgZone` instance.
   * - `zone.js` - Use default `NgZone` which requires `Zone.js`.
   * - `noop` - Use `NoopNgZone` which does nothing.
   */
  ngZone?: NgZone | 'zone.js' | 'noop';
  /**
   * Optionally specify coalescing event change detections or not.
   * Consider the following case.
   *
   * <div (click)="doSomething()">
   *   <button (click)="doSomethingElse()"></button>
   * </div>
   *
   * When button is clicked, because of the event bubbling, both
   * event handlers will be called and 2 change detections will be
   * triggered. We can colesce such kind of events to only trigger
   * change detection only once.
   *
   * By default, this option will be false. So the events will not be
   * coalesced and the change detection will be triggered multiple times.
   * And if this option be set to true, the change detection will be
   * triggered async by scheduling a animation frame. So in the case above,
   * the change detection will only be triggered once.
   */
  ngZoneEventCoalescing?: boolean;
  /**
   * Optionally specify if `NgZone#run()` method invocations should be coalesced
   * into a single change detection.
   *
   * Consider the following case.
   *
   * for (let i = 0; i < 10; i ++) {
   *   ngZone.run(() => {
   *     // do something
   *   });
   * }
   *
   * This case triggers the change detection multiple times.
   * With ngZoneRunCoalescing options, all change detections in an event loop trigger only once.
   * In addition, the change detection executes in requestAnimation.
   *
   */
  ngZoneRunCoalescing?: boolean;
}

export class NativeScriptPlatformRefProxy extends PlatformRef {
  options: AppRunOptions<any, any>;
  constructor(private platform: PlatformRef, private launchView?: AppLaunchView) {
    super();
  }

  bootstrapModuleFactory<M>(moduleFactory: NgModuleFactory<M>): Promise<NgModuleRef<M>> {
    this.options = {
      appModuleBootstrap: () => this.platform.bootstrapModuleFactory(moduleFactory),
      launchView: () => this.launchView,
    };

    runNativeScriptAngularApp(this.options);

    return null;
  }
  bootstrapModule<M>(moduleType: Type<M>, compilerOptions?: (CompilerOptions & BootstrapOptions) | Array<CompilerOptions & BootstrapOptions>): Promise<NgModuleRef<M>> {
    this.options = {
      appModuleBootstrap: () => this.platform.bootstrapModule(moduleType, compilerOptions),
    };

    runNativeScriptAngularApp(this.options);

    return null;
  }

  onDestroy(callback: () => void): void {
    this.platform.onDestroy(callback);
  }

  get injector(): Injector {
    return this.platform.injector;
  }

  destroy(): void {
    this.platform.destroy();
  }

  get destroyed(): boolean {
    return this.platform.destroyed;
  }
}
