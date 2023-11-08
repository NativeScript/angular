import { NativeScriptNgZone, platformNativeScript, runNativeScriptAngularApp } from '@nativescript/angular';
import { Trace } from '@nativescript/core';

import { AppModule } from './app/app.module';
import { setWindowBackgroundColor } from '@nativescript/core/utils/ios';

Trace.enable();
Trace.setCategories('ns-route-reuse-strategy,ns-router');

runNativeScriptAngularApp({
  appModuleBootstrap: () => {
    if (global.isIOS) {
      setWindowBackgroundColor('#a6120d');
    }
    return platformNativeScript().bootstrapModule(AppModule, {
      ngZone: new NativeScriptNgZone(),
    });
  },
});

// Comment above and Uncomment below to try without custom NgZone:
// runNativeScriptAngularApp({
//   appModuleBootstrap: () => platformNativeScript().bootstrapModule(AppModule),
// });
