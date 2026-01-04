import {
  bootstrapApplication,
  provideNativeScriptHttpClient,
  provideNativeScriptNgZone,
  provideNativeScriptRouter,
  runNativeScriptAngularApp,
} from '@nativescript/angular';
import { Trace, Utils, SplitView } from '@nativescript/core';

// import { AppModule } from './app/app.module';
import { withInterceptorsFromDi } from '@angular/common/http';
import { AppComponent } from './app/app.component';
import { routes } from './app/app.routes';
import { provideZonelessChangeDetection } from '@angular/core';
// For SplitView demo
import { SPLIT_VIEW_ROUTES } from './app/split-view-demo/split-view.routes';
import { SplitViewDemoComponent } from './app/split-view-demo/split-view-demo.component';

const ZONELESS = true;

Trace.enable();
Trace.setCategories('ns-route-reuse-strategy,ns-router');

// For SplitView demo
// Set the split style before bootstrapping - 'triple' is needed for primary/supplementary/secondary layout
SplitView.SplitStyle = 'triple';

runNativeScriptAngularApp({
  appModuleBootstrap: () => {
    if (__APPLE__) {
      Utils.ios.setWindowBackgroundColor('#a6120d');
    }
    // Note: Try SplitView by booting with
    // SplitViewDemoComponent as the root component
    // and comment/uncomment router below
    // try with iPad!
    return bootstrapApplication(AppComponent, {
      providers: [
        provideNativeScriptHttpClient(withInterceptorsFromDi()),
        provideNativeScriptRouter(routes),
        // provideNativeScriptRouter(SPLIT_VIEW_ROUTES),
        ZONELESS ? provideZonelessChangeDetection() : provideNativeScriptNgZone(),
      ],
    });
  },
});

// Comment above and Uncomment below to try without custom NgZone:
// runNativeScriptAngularApp({
//   appModuleBootstrap: () => platformNativeScript().bootstrapModule(AppModule),
// });
