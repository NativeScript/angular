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
