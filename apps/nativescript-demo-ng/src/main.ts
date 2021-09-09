import { NativeScriptNgZone, platformNativeScript, runNativeScriptAngularApp } from '@nativescript/angular';

import { AppModule } from './app/app.module';

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
