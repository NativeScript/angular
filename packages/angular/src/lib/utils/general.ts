import { Application, View } from '@nativescript/core';

/**
 * NativeScript can silently fail to present a modal view (for example, on iOS when the
 * parent is already presenting another view controller, or the parent isn't part of the
 * window hierarchy). In those cases `showModal()` returns without actually presenting and
 * without raising an error, which would otherwise leave modal navigation stuck and the
 * attached Angular view leaked on the `ApplicationRef`. This checks whether the modal was
 * really presented so callers can roll everything back when it wasn't.
 *
 * @param parentView The view `showModal()` was called on.
 * @param modalView The view that was passed to `showModal()`.
 */
export function didModalOpen(parentView: View, modalView: View): boolean {
  // Fast path: on a successful present, core sets `_modalParent` on the modal view itself,
  // so we can confirm in O(1) without walking the view tree in the common (success) case.
  if (modalView && (modalView as { _modalParent?: View })._modalParent) {
    return true;
  }

  // Slow path (real confirmation): core sets `modal` to the modal view on the parent that owns
  // a native view controller/fragment. On Android that's the exact `parentView`, but on iOS core
  // walks up to the first ancestor with a view controller and sets it there, so we walk the
  // parent chain to cover both platforms.
  let view: View = parentView;
  while (view) {
    if (view.modal === modalView) {
      return true;
    }
    view = view.parent as View;
  }

  // On Android, presenting while the app is backgrounded and the parent isn't loaded is
  // deferred until the parent loads again rather than failing, so treat it as opened.
  if (global.isAndroid && Application.inBackground && parentView && !parentView.isLoaded) {
    return true;
  }

  return false;
}

/**
 * Utility method to ensure a NgModule is only imported once in a codebase, otherwise will throw to help prevent accidental double importing
 * @param parentModule Parent module name
 * @param moduleName The module name
 */
export function throwIfAlreadyLoaded(parentModule: any, moduleName: string) {
  if (parentModule) {
    throw new Error(`${moduleName} has already been loaded. Import ${moduleName} in the AppModule only.`);
  }
}

/**
 * Utility method which will only fire the callback once ever
 * @param fn callback to call only once
 */
// eslint-disable-next-line @typescript-eslint/no-unsafe-function-type
export function once(fn: Function) {
  let wasCalled = false;

  return function wrapper() {
    if (wasCalled) {
      return;
    }

    wasCalled = true;
    // eslint-disable-next-line prefer-spread, prefer-rest-params
    fn.apply(null, arguments);
  };
}

/** Interface that can be used to generically type a class. */
export interface ComponentType<T> {
  new (...args: any[]): T;
}

export function isListLikeIterable(obj: any): boolean {
  if (!isJsObject(obj)) return false;
  return (
    Array.isArray(obj) ||
    (!(obj instanceof Map) && // JS Map are iterables but return entries as [k, v]
      Symbol.iterator in obj)
  ); // JS Iterable have a Symbol.iterator prop
}

export function isJsObject(o: any): boolean {
  return o !== null && (typeof o === 'function' || typeof o === 'object');
}
