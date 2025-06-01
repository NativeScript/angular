import {
  bootstrapApplication,
  provideNativeScriptHttpClient,
  provideNativeScriptNgZone,
  provideNativeScriptRouter,
  runNativeScriptAngularApp,
} from '@nativescript/angular';
import { Trace } from '@nativescript/core';

// import { AppModule } from './app/app.module';
import { withInterceptorsFromDi } from '@angular/common/http';
import { setWindowBackgroundColor } from '@nativescript/core/utils/ios';
import { AppComponent } from './app/app.component';
import { routes } from './app/app.routes';
import { provideZonelessChangeDetection } from '@angular/core';

const ZONELESS = true;

Trace.enable();
Trace.setCategories('ns-route-reuse-strategy,ns-router');

runNativeScriptAngularApp({
  appModuleBootstrap: () => {
    if (__APPLE__) {
      setWindowBackgroundColor('#a6120d');
    }
    return bootstrapApplication(AppComponent, {
      providers: [
        provideNativeScriptHttpClient(withInterceptorsFromDi()),
        provideNativeScriptRouter(routes),
        ZONELESS ? provideZonelessChangeDetection() : provideNativeScriptNgZone(),
      ],
    });
  },
});

// Comment above and Uncomment below to try without custom NgZone:
// runNativeScriptAngularApp({
//   appModuleBootstrap: () => platformNativeScript().bootstrapModule(AppModule),
// });
