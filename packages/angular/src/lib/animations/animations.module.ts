import { NgModule, Injectable, Inject, NgZone, RendererFactory2, Optional, SkipSelf, ɵChangeDetectionScheduler as ChangeDetectionScheduler, inject } from '@angular/core';
import { DOCUMENT } from '@angular/common';
import { AnimationBuilder, ɵBrowserAnimationBuilder as BrowserAnimationBuilder } from '@angular/animations';

import { AnimationDriver, ɵAnimationRendererFactory as AnimationRendererFactory, ɵAnimationStyleNormalizer as AnimationStyleNormalizer, ɵWebAnimationsStyleNormalizer as WebAnimationsStyleNormalizer, ɵAnimationEngine as AnimationEngine } from '@angular/animations/browser';

// import { NativeScriptModule } from "../nativescript.module";
import { NativeScriptRendererFactory } from '../nativescript-renderer';
import { NativeScriptAnimationDriver } from './animation-driver';
import { throwIfAlreadyLoaded } from '../utils/general';
import { NativeScriptCommonModule } from '../nativescript-common.module';

@Injectable()
export class InjectableAnimationEngine extends AnimationEngine {
  constructor(@Inject(DOCUMENT) doc: any, driver: AnimationDriver, normalizer: AnimationStyleNormalizer) {
    super(doc, driver, normalizer);
  }
}

export function instantiateSupportedAnimationDriver() {
  return new NativeScriptAnimationDriver();
}

export function instantiateRendererFactory(renderer: NativeScriptRendererFactory, engine: AnimationEngine, zone: NgZone) {
  return new AnimationRendererFactory(renderer, engine, zone);
}

export function instantiateDefaultStyleNormalizer() {
  return new WebAnimationsStyleNormalizer();
}

@NgModule({
  imports: [NativeScriptCommonModule],
  providers: [
    {
      provide: AnimationDriver,
      useFactory: instantiateSupportedAnimationDriver,
    },
    { provide: AnimationBuilder, useClass: BrowserAnimationBuilder },
    {
      provide: AnimationStyleNormalizer,
      useFactory: instantiateDefaultStyleNormalizer,
    },
    { provide: AnimationEngine, useClass: InjectableAnimationEngine },
    {
      provide: RendererFactory2,
      useFactory: instantiateRendererFactory,
      deps: [NativeScriptRendererFactory, AnimationEngine, NgZone],
    },
  ],
})
export class NativeScriptAnimationsModule {
  constructor(@Optional() @SkipSelf() parentModule: NativeScriptAnimationsModule) {
    // Prevents NativeScriptAnimationsModule from getting imported multiple times
    throwIfAlreadyLoaded(parentModule, 'NativeScriptAnimationsModule');
  }
}
