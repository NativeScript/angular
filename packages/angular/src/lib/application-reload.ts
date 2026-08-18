/**
 * Session reuse for isolate-preserving `reloadApplication`.
 *
 * `runNativeScriptAngularApp` must not call `Application.run()` again after
 * the process has launched. The first call owns launch listeners and the
 * `__reboot_ng_modules__` closures. A later evaluation (OTA re-import, or
 * HMR without `__NS_ANGULAR_HMR_REGISTER_ONLY__`) should update options and
 * reboot that session.
 */

export type AngularAppSessionAction = 'register-only' | 'reboot-existing' | 'first-launch';

export interface AngularAppSessionGlobals {
  __NS_ANGULAR_HMR_REGISTER_ONLY__?: unknown;
  __NS_UPDATE_ANGULAR_APP_OPTIONS__?: unknown;
  __reboot_ng_modules__?: unknown;
}

export function resolveAngularAppSessionAction(
  globalObj: AngularAppSessionGlobals,
  hasLaunched: boolean,
): AngularAppSessionAction {
  const canUpdateOptions = typeof globalObj.__NS_UPDATE_ANGULAR_APP_OPTIONS__ === 'function';
  if (globalObj.__NS_ANGULAR_HMR_REGISTER_ONLY__ && canUpdateOptions) {
    return 'register-only';
  }
  if (hasLaunched && typeof globalObj.__reboot_ng_modules__ === 'function') {
    return 'reboot-existing';
  }
  return 'first-launch';
}
