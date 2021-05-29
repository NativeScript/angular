import 'zone.js/dist/zone.js';
import '@nativescript/zone-js';
import { platformNativescript, platformNativeScriptDynamic, runNativescriptAngularApp } from '@nativescript/angular';
import { Application, StackLayout } from '@nativescript/core';

import { AppModule } from './app/app.module';
import { hmrAccept } from './hmr-accept';

hmrAccept(module);

// platformNativeScriptDynamic().bootstrapModule(AppModule);

runNativescriptAngularApp({
  appModuleBootstrap: () => platformNativescript().bootstrapModule(AppModule),
});
