import {
  bootstrapApplication,
  NativeDialogModule,
  provideNativeScriptHttpClient,
  provideNativeScriptNgZone,
  provideNativeScriptRouter,
  runNativeScriptAngularApp,
} from '@nativescript/angular';
import { Trace } from '@nativescript/core';

// import { AppModule } from './app/app.module';
import { withInterceptorsFromDi } from '@angular/common/http';
import { importProvidersFrom } from '@angular/core';
import { setWindowBackgroundColor } from '@nativescript/core/utils/ios';
import { routes } from './app/app-routing.module';
import { AppComponent } from './app/app.component';

Trace.enable();
Trace.setCategories('ns-route-reuse-strategy,ns-router');

runNativeScriptAngularApp({
  appModuleBootstrap: () => {
    if (global.isIOS) {
      setWindowBackgroundColor('#a6120d');
    }
    return bootstrapApplication(AppComponent, {
      providers: [
        provideNativeScriptHttpClient(withInterceptorsFromDi()),
        provideNativeScriptRouter(routes),
        importProvidersFrom(NativeDialogModule),
        provideNativeScriptNgZone(),
      ],
    });
  },
});

// Comment above and Uncomment below to try without custom NgZone:
// runNativeScriptAngularApp({
//   appModuleBootstrap: () => platformNativeScript().bootstrapModule(AppModule),
// });
