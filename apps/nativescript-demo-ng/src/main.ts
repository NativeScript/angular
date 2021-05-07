import './polyfills';
import { platformNativescript, platformNativeScriptDynamic, runNativescriptAngularApp } from '@nativescript/angular';
import { Application, StackLayout } from '@nativescript/core';

import { AppModule } from './app/app.module';

// // TODO: maybe streamline this
// function doBootstrap(args) {
//     args.root = new StackLayout();
//     disposeLastModule();
//     platformNativeScriptDynamic().bootstrapModule(AppModule).then((ref) => {
//         (global as any).ngRootModule = ref;
//     }, (err) => console.log(err));
// }

// function disposeLastModule() {
//     if((global as any).ngRootModule) {
//         (global as any).ngRootModule.destroy();
//         (global as any).ngRootModule = null;
//     }
// }

// (<any>global).__onLiveSyncCore = () => {
//     doBootstrap({});
// };

if ((module as any).hot) {
  (module as any).hot.accept('./app/app.module', () => {
    global['hmrRefresh']({});
  });
}

// Application.on("launch", doBootstrap);
// Application.on("exit", disposeLastModule);
// Application.run();

// platformNativeScriptDynamic().bootstrapModule(AppModule);

runNativescriptAngularApp({
  appModuleBootstrap: () => platformNativescript().bootstrapModule(AppModule),
});
