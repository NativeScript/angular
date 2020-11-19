import { platformNativeScript, platformNativeScriptDynamic, runNativeScriptAngularApp } from '@nativescript/angular';
import { Application, StackLayout } from '@nativescript/core';

import { AppModule } from './app/app.module';
import { hmrAccept } from './hmr-accept';

hmrAccept(module);

// platformNativeScriptDynamic().bootstrapModule(AppModule);

runNativeScriptAngularApp({
  appModuleBootstrap: () => platformNativeScript().bootstrapModule(AppModule),
});
