import { platformNativeScript, platformNativeScriptDynamic, runNativescriptAngularApp } from '@nativescript/angular';
import { Application, StackLayout } from '@nativescript/core';

import { AppModule } from './app/app.module';
import { hmrAccept } from './hmr-accept';

hmrAccept(module);

// platformNativeScriptDynamic().bootstrapModule(AppModule);

runNativescriptAngularApp({
  appModuleBootstrap: () => platformNativeScript().bootstrapModule(AppModule),
});
