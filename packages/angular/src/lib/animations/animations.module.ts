import { NgModule, Injectable, Inject, NgZone, RendererFactory2, Optional, SkipSelf } from '@angular/core';
import { DOCUMENT } from '@angular/common';
import { AnimationBuilder } from '@angular/animations';

import { AnimationDriver, ɵAnimationStyleNormalizer as AnimationStyleNormalizer, ɵWebAnimationsStyleNormalizer as WebAnimationsStyleNormalizer, ɵAnimationEngine as AnimationEngine } from '@angular/animations/browser';

// import { ɵAnimationRendererFactory as AnimationRendererFactory, ɵBrowserAnimationBuilder as BrowserAnimationBuilder } from '@angular/platform-browser/animations';

// import { NativeScriptModule } from "../nativescript.module";
// import { NativeScriptRendererFactory } from '../nativescript-renderer';
import { NativeScriptAnimationDriver } from './animation-driver';
import { throwIfAlreadyLoaded } from '../utils/general';
import { NativeScriptCommonModule } from '../nativescript-common.module';

@Injectable()
export class InjectableAnimationEngine extends AnimationEngine {
  constructor(@Inject(DOCUMENT) doc: any, driver: AnimationDriver, normalizer: AnimationStyleNormalizer) {
    super(doc.body, driver, normalizer);
  }
}

export function instantiateSupportedAnimationDriver() {
  return new NativeScriptAnimationDriver();
}

// export function instantiateRendererFactory(renderer: NativeScriptRendererFactory, engine: AnimationEngine, zone: NgZone) {
//   return new AnimationRendererFactory(renderer, engine, zone);
// }

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
    // { provide: AnimationBuilder, useClass: BrowserAnimationBuilder },
    {
      provide: AnimationStyleNormalizer,
      useFactory: instantiateDefaultStyleNormalizer,
    },
    { provide: AnimationEngine, useClass: InjectableAnimationEngine },
    // {
    //   provide: RendererFactory2,
    //   useFactory: instantiateRendererFactory,
    //   deps: [NativeScriptRendererFactory, AnimationEngine, NgZone],
    // },
  ],
})
export class NativeScriptAnimationsModule {
  constructor(@Optional() @SkipSelf() parentModule: NativeScriptAnimationsModule) {
    // Prevents NativeScriptAnimationsModule from getting imported multiple times
    throwIfAlreadyLoaded(parentModule, 'NativeScriptAnimationsModule');
  }
}
