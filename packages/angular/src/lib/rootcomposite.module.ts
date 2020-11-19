import { NgModule } from '@angular/core';
import { Application, ContentView, RootLayout, View } from '@nativescript/core';
import { APP_ROOT_VIEW, DISABLE_ROOT_VIEW_HANDLING } from './tokens';

export class RootViewProxy extends ContentView {
  constructor(private parentRootLayout: RootLayout) {
    super();
  }

  _addView(view: View, atIndex?: number) {
    super._addView(view, atIndex);
    if (this.parentRootLayout.getChildIndex(this) < 0) {
      this.parentRootLayout.insertChild(this, 0);
    }
  }

  _removeView(view: View) {
    super._removeView(view);
    this.parentRootLayout.removeChild(this);
  }
}

/**
 * This generates a RootLayout and returns a RootViewProxy.
 * Setting RootViewProxy.content will add the view to the bottom of the RootLayout
 * Setting RootViewProxy.content = null will remove the view from the RootLayout
 * @returns RootViewProxy that will insert content into the start of the RootLayout
 */
export function generateRootLayoutAndProxy() {
  let rootView = Application.getRootView();
  if (!rootView || !(rootView instanceof RootLayout)) {
    rootView = new RootLayout();
    Application.resetRootView({ create: () => rootView });
  }
  const viewProxy = new RootViewProxy(rootView as RootLayout);
  // (rootView as RootLayout).insertChild(viewProxy, 0);
  return viewProxy;
}

@NgModule({
  providers: [
    { provide: DISABLE_ROOT_VIEW_HANDLING, useValue: true },
    { provide: APP_ROOT_VIEW, useFactory: generateRootLayoutAndProxy },
  ],
})
export class RootCompositeModule {}
