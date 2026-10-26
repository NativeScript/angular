import { type Injector, ɵresetCompiledComponents } from '@angular/core';
import { NativeScriptDebug } from '../trace';

/*
 * Development-only HMR support for @nativescript/vite.
 *
 * Every caller outside this folder must guard its call with
 * `typeof ngDevMode === 'undefined' || ngDevMode` so release builds
 * (which define `ngDevMode` as false) drop this code entirely.
 */

export type HmrPhase = 'beforeDispose' | 'afterBootstrap';
export type HmrHooks = Partial<Record<HmrPhase, (injector: Injector) => void>>;

export interface HmrRouteState {
  /** URL to boot at on the next reboot. */
  pending?: string;
  /** Named-outlet URL to navigate to once the reboot's initial navigation settles. */
  forward?: string;
  /** URL being restored; set from the reboot until shortly after navigation settles. */
  restoring?: string;
  timer?: ReturnType<typeof setTimeout>;
}

interface HmrState {
  hooks: Map<string, HmrHooks>;
  components: Map<string, unknown>;
  route: HmrRouteState;
  dialogs: unknown[];
  cache?: unknown;
}

// One global slot so state survives even if this package is evaluated more than once per session
// (e.g. when it is linked from source and evicted along with app modules).
const STATE_KEY = '__NS_NG_HMR__';

export function hmrState(): HmrState {
  const g = globalThis as unknown as Record<string, HmrState>;
  return (g[STATE_KEY] ??= { hooks: new Map(), components: new Map(), route: {}, dialogs: [] });
}

/** Reads state without creating it, for public APIs that also run in release builds. */
export function peekHmrState(): HmrState | undefined {
  return (globalThis as unknown as Record<string, HmrState | undefined>)[STATE_KEY];
}

/** True inside a live @nativescript/vite HMR session (not a plain dev build). */
export function isHmrActive(): boolean {
  const g = globalThis as Record<string, unknown>;
  return !!(g.__NS_HOT_REGISTRY__ || g.__NS_DEV_PLACEHOLDER_ROOT_EARLY__ || g.__NS_HMR_BOOT_COMPLETE__);
}

/** Registers (or replaces) hooks that run around every `hotreload` reboot. */
export function registerHmrHooks(name: string, hooks: HmrHooks): void {
  hmrState().hooks.set(name, hooks);
}

export function runHmrHooks(phase: HmrPhase, injector: Injector | null | undefined): void {
  if (!injector) {
    return;
  }
  for (const [name, hooks] of hmrState().hooks) {
    try {
      hooks[phase]?.(injector);
    } catch (err) {
      NativeScriptDebug.hmrLogError(`${name}.${phase} failed: ${(err as Error)?.message ?? err}`);
    }
  }
}

/** Latest class evaluated under `name`; Vite re-registers components each time their module re-evaluates. */
export function getHmrComponentClass<T>(name: string): T | undefined {
  return hmrState().components.get(name) as T | undefined;
}

export function hmrLog(message: string): void {
  if (NativeScriptDebug.isLogEnabled()) {
    NativeScriptDebug.hmrLog(message);
  }
}

/**
 * Vite re-imports the app entry with `__NS_ANGULAR_HMR_REGISTER_ONLY__` set. That re-run of
 * `runNativeScriptAngularApp` must only hand its fresh options to the running app.
 * @returns true when the options were handed off and the caller must not boot.
 */
export function handOffHmrAppOptions(options: unknown): boolean {
  const g = globalThis as Record<string, unknown>;
  if (g.__NS_ANGULAR_HMR_REGISTER_ONLY__ && typeof g.__NS_UPDATE_ANGULAR_APP_OPTIONS__ === 'function') {
    g.__NS_UPDATE_ANGULAR_APP_OPTIONS__(options);
    return true;
  }
  return false;
}

/** Installs the globals the @nativescript/vite Angular HMR client calls. */
export function installViteHmrGlobals(updateAppOptions: (options: never) => void): void {
  const g = globalThis as Record<string, unknown>;
  g.__NS_UPDATE_ANGULAR_APP_OPTIONS__ = updateAppOptions;
  // Called before re-importing changed modules so their components can be defined again without NG0912.
  g.__reset_ng_compiled_components__ = () => ɵresetCompiledComponents();
  g.__NS_HMR_REGISTER_COMPONENT__ = (name: string, cls: unknown) => {
    if (name && cls) {
      hmrState().components.set(name, cls);
    }
  };
}
