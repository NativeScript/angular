import { NativeScriptNgZone, platformNativeScript, runNativeScriptAngularApp } from '@nativescript/angular';
import { Trace } from '@nativescript/core';

import { AppModule } from './app/app.module';

Trace.enable();
Trace.setCategories('ns-route-reuse-strategy,ns-router');

runNativeScriptAngularApp({
  appModuleBootstrap: () =>
    platformNativeScript().bootstrapModule(AppModule, {
      ngZone: new NativeScriptNgZone(),
    }),
});

// Comment above and Uncomment below to try without custom NgZone:
// runNativeScriptAngularApp({
//   appModuleBootstrap: () => platformNativeScript().bootstrapModule(AppModule),
// });
