// Runtime-import free so it can be unit tested without Angular or NativeScript.

const GUIDE = 'See docs/vite-hmr-migration.md in NativeScript/angular.';

const NO_OP_UNDER_VITE =
  'does nothing under Vite: the app entry is an HMR boundary, so prepareHmrReboot() tears the app down and the re-evaluated entry bootstraps it.';

/**
 * One-time warnings of the deprecated HMR globals that `installAngularHmrCompatGlobals()` defines,
 * keyed by global name. The migration guide quotes these strings.
 */
export const ANGULAR_HMR_GLOBAL_DEPRECATIONS = {
  __NS_UPDATE_ANGULAR_APP_OPTIONS__: `[@nativescript/angular] globalThis.__NS_UPDATE_ANGULAR_APP_OPTIONS__ is deprecated and does nothing: the re-evaluated app entry calls runNativeScriptAngularApp with its new options itself. Remove the call. ${GUIDE}`,
  __NS_ANGULAR_HMR_REGISTER_ONLY__: `[@nativescript/angular] globalThis.__NS_ANGULAR_HMR_REGISTER_ONLY__ is deprecated and always false: the re-evaluated app entry always bootstraps. Remove the check. ${GUIDE}`,
  __reboot_ng_modules__: `[@nativescript/angular] globalThis.__reboot_ng_modules__ is deprecated: it re-bootstraps the running app in place, carrying HMR participant state. Edits already reboot through the app entry's HMR boundary; keep state across reboots with a NATIVESCRIPT_HMR_PARTICIPANTS provider. ${GUIDE}`,
  __dispose_app_ng_modules__: `[@nativescript/angular] globalThis.__dispose_app_ng_modules__ is deprecated and ${NO_OP_UNDER_VITE} ${GUIDE}`,
  __dispose_app_ng_platform__: `[@nativescript/angular] globalThis.__dispose_app_ng_platform__ is deprecated and ${NO_OP_UNDER_VITE} ${GUIDE}`,
  __bootstrap_app_ng_modules__: `[@nativescript/angular] globalThis.__bootstrap_app_ng_modules__ is deprecated and ${NO_OP_UNDER_VITE} ${GUIDE}`,
  __cleanup_ng_hot__: `[@nativescript/angular] globalThis.__cleanup_ng_hot__ is deprecated and ${NO_OP_UNDER_VITE} ${GUIDE}`,
  __NS_NG_HMR__: `[@nativescript/angular] globalThis.__NS_NG_HMR__ is deprecated and read-only: use isAngularHmrRestoringRoute()/getAngularHmrRestoringRoute() and HmrCacheService from @nativescript/angular. ${GUIDE}`,
  __NS_HMR_REGISTER_COMPONENT__: `[@nativescript/angular] globalThis.__NS_HMR_REGISTER_COMPONENT__ is deprecated: list the components of dialogs opened with preserveOnHmr in provideNativeScriptHmrCompat({ dialogComponents }). ${GUIDE}`,
  __reset_ng_compiled_components__: `[@nativescript/angular] globalThis.__reset_ng_compiled_components__ is deprecated: prepareHmrReboot() already resets compiled components on every reboot. Remove the call. ${GUIDE}`,
} as const;

export type AngularHmrGlobalName = keyof typeof ANGULAR_HMR_GLOBAL_DEPRECATIONS;

// Library scope: the compat provider runs on every reboot, and each warning must still print once per process.
const warned = new Set<string>();

export function warnDeprecatedOnce(name: AngularHmrGlobalName, warn: (message: string) => void = console.warn): void {
  if (warned.has(name)) {
    return;
  }
  warned.add(name);
  warn(ANGULAR_HMR_GLOBAL_DEPRECATIONS[name]);
}

/** Test seam: forget which warnings were printed. */
export function resetDeprecationWarnings(): void {
  warned.clear();
}
