// Runtime-import free so it can be unit tested without Angular or NativeScript.
import { AngularHmrGlobalName, warnDeprecatedOnce } from './deprecations';

export interface AngularHmrCompatGlobalsDeps {
  resetCompiledComponents(): void;
  /** Re-bootstraps the running app in place; false when no app is running. */
  rebootInPlace(disposePlatform: boolean): boolean;
  registerComponent(name: unknown, component: unknown): void;
  /** Read-only view served as `__NS_NG_HMR__`. */
  legacyState(): object;
  warn?: (message: string) => void;
}

// Library scope: the compat provider runs on every reboot.
const installedOn = new WeakSet<object>();

/**
 * Defines the deprecated `@nativescript/angular` HMR globals on `target`, each forwarding to its
 * replacement and warning once. A global something else already defined is left alone, so
 * webpack's `__reboot_ng_modules__` family is never shadowed.
 */
export function defineAngularHmrCompatGlobals(target: object, deps: AngularHmrCompatGlobalsDeps): void {
  if (installedOn.has(target)) {
    return;
  }
  installedOn.add(target);
  const warn = (name: AngularHmrGlobalName) => warnDeprecatedOnce(name, deps.warn);
  const fn = (name: AngularHmrGlobalName, impl: (...args: unknown[]) => unknown) => {
    if (name in target) {
      return;
    }
    Object.defineProperty(target, name, {
      configurable: true,
      writable: true,
      value: (...args: unknown[]) => {
        warn(name);
        return impl(...args);
      },
    });
  };
  const readOnly = (name: AngularHmrGlobalName, get: () => unknown) => {
    if (name in target) {
      return;
    }
    Object.defineProperty(target, name, {
      configurable: true,
      get: () => {
        warn(name);
        return get();
      },
      set: () => warn(name),
    });
  };
  const noop = () => undefined;

  fn('__NS_UPDATE_ANGULAR_APP_OPTIONS__', noop);
  readOnly('__NS_ANGULAR_HMR_REGISTER_ONLY__', () => false);
  fn('__reboot_ng_modules__', (disposePlatform) => {
    deps.rebootInPlace(!!disposePlatform);
  });
  fn('__dispose_app_ng_modules__', noop);
  fn('__dispose_app_ng_platform__', noop);
  fn('__bootstrap_app_ng_modules__', noop);
  fn('__cleanup_ng_hot__', noop);
  readOnly('__NS_NG_HMR__', () => deps.legacyState());
  fn('__NS_HMR_REGISTER_COMPONENT__', (name, component) => deps.registerComponent(name, component));
  fn('__reset_ng_compiled_components__', () => deps.resetCompiledComponents());
}
