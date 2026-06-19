/**
 * Centralised dev-mode + HMR detection for `@nativescript/angular` helpers.
 *
 * The package ships HMR scaffolding (route tracker, route replay, modal
 * preservation, compiled-component reset) that subscribes to long-lived
 * router and bootstrap streams. None of that work belongs in a production
 * binary — it would attach observers that never fire and keep references
 * that confuse Angular's destroy logic.
 *
 * Every HMR helper consults {@link isAngularHmrEnabled} from its
 * constructor. The check is intentionally cheap (no network, no I/O) so it
 * is safe to call in dependency-injection factories and in fast paths.
 *
 * Detection cascade (returns the first match):
 *  1. **Production build short-circuit** — `ngDevMode === false` means
 *     Angular built the app in production mode. We bail immediately.
 *  2. **NativeScript Vite dev signal** — see
 *     {@link isNativeScriptViteHmrActive}. We accept either of the two
 *     persistent globals the NS Vite root-placeholder installer manages
 *     (`__NS_DEV_PLACEHOLDER_ROOT_EARLY__` during early boot,
 *     `__NS_HMR_BOOT_COMPLETE__` after the real app root commits) so
 *     services that are constructed *after* the placeholder has handed
 *     off — e.g. `NativeDialog` instantiated lazily when the user opens
 *     their first modal — still detect HMR correctly.
 *  3. **Webpack HMR signal** — `globalThis.__webpack_require__` is set
 *     when the webpack runtime is loaded. Combined with the `ngDevMode`
 *     short-circuit above, its presence means "webpack dev". The
 *     production webpack runtime also sets the global, but `ngDevMode`
 *     would already be `false`, so the production case never reaches
 *     here.
 *
 * If none of these match, the caller should treat HMR as disabled and
 * skip subscribing to disposal/bootstrap streams.
 *
 * The webpack signal lives on `globalThis` rather than `import.meta` so
 * this file compiles cleanly under `--module commonjs` (the jest spec
 * compiler) and under `--module esnext` (the library build).
 */

declare const ngDevMode: boolean | undefined;

export function isAngularHmrEnabled(): boolean {
  if (typeof ngDevMode !== 'undefined' && ngDevMode === false) {
    return false;
  }
  return isNativeScriptViteHmrActive() || isWebpackHmrActive();
}

/**
 * True when the NativeScript Vite dev HMR runtime is active. This is the
 * most reliable signal that the project's `nativescript.config.ts` set
 * `bundler: 'vite'` AND we are running the dev server.
 *
 * The NS Vite root-placeholder installer manages two persistent globals:
 *  - `__NS_DEV_PLACEHOLDER_ROOT_EARLY__` is set the moment the placeholder
 *    runs (very early, before the real app boots), then **deleted** by
 *    `clearPlaceholderGlobals` once `tryFinalizeBootPlaceholder` succeeds.
 *  - `__NS_HMR_BOOT_COMPLETE__` is set in the same finalize step and is
 *    **never deleted** for the lifetime of the dev session.
 *
 * Callers run the gamut of timing — e.g. the route tracker is constructed
 * during bootstrap (early flag still set) but `NativeDialog` is typically
 * instantiated lazily when the user opens their first modal (early flag
 * already cleared, complete flag set). Checking either global covers both
 * windows. If we only checked the early flag, every late-instantiated
 * service would silently no-op and HMR features (modal preservation,
 * route replay) would appear broken in development.
 */
export function isNativeScriptViteHmrActive(): boolean {
  const g = globalThis as {
    __NS_DEV_PLACEHOLDER_ROOT_EARLY__?: unknown;
    __NS_HMR_BOOT_COMPLETE__?: unknown;
  };
  return !!(g.__NS_DEV_PLACEHOLDER_ROOT_EARLY__ || g.__NS_HMR_BOOT_COMPLETE__);
}

/**
 * True when the webpack runtime is loaded. The webpack runtime sets
 * `__webpack_require__` on `globalThis` whenever a webpack bundle is
 * executing — both in dev and prod. Callers gate on
 * {@link isAngularHmrEnabled} (not this directly) so the production
 * short-circuit fires first.
 */
export function isWebpackHmrActive(): boolean {
  return typeof (globalThis as { __webpack_require__?: unknown }).__webpack_require__ === 'function';
}

/**
 * True when Angular reports we are running with dev-mode flags. Useful
 * for code paths that want to opt out of cost in production but don't
 * care which bundler is running.
 */
export function isAngularDevMode(): boolean {
  if (typeof ngDevMode === 'undefined') {
    return true;
  }
  return ngDevMode !== false;
}
