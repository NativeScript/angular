/**
 * Fresh-class registry for HMR.
 *
 * After an HMR reboot, every previously imported component module is
 * re-evaluated. Each `@Component()`-decorated class becomes a *new* class
 * object — it shares the source name (e.g. `ResourceModalComponent`) but
 * has a different identity from the class the host code captured before
 * the reboot.
 *
 * Helpers like `NativeDialog._restoreSingleDialog` need to re-open a
 * captured modal *with the new class so the visual update applies*.
 * Holding onto the pre-reboot class reference reopens the modal with
 * the old metadata, which manifests as "the change appears the next
 * time I close and re-open the modal myself, but not when HMR auto-
 * reopens it."
 *
 * The mechanism is:
 *
 *   1. The Vite plugin `ns-component-hmr-register` (in
 *      `@nativescript/vite/configuration/angular`) injects a
 *      registration call at the end of every user `.ts` file that
 *      defines an `@Component`-decorated class:
 *
 *        if (typeof globalThis.__NS_HMR_REGISTER_COMPONENT__ === 'function') {
 *          try { globalThis.__NS_HMR_REGISTER_COMPONENT__(
 *            'ResourceModalComponent', ResourceModalComponent, import.meta.url
 *          ); } catch {}
 *        }
 *
 *   2. This module installs `__NS_HMR_REGISTER_COMPONENT__` on
 *      `globalThis` so module re-evaluations after an HMR reboot
 *      replace the previously-registered class with the fresh one.
 *
 *   3. HMR helpers (modal restore, route replay) read the registry
 *      via {@link getFreshComponentClass} to swap in the fresh class.
 *
 * This avoids patching `ɵɵdefineComponent` directly, which is exported
 * as an immutable ESM namespace binding from `@angular/core` — patch
 * attempts silently fail (the assignment is a no-op under strict
 * mode) so the registry never gets populated. With the self-
 * registration approach the binding stays untouched and we don't
 * depend on Angular's internal export shape.
 *
 * Production short-circuit: the registrar is only installed when
 * {@link isAngularHmrEnabled} reports dev + (vite | webpack). In a
 * production build the global hook is never assigned and the Vite
 * plugin only runs in `apply: 'serve'`, so the registration calls
 * never reach the runtime.
 */

import { isAngularDevMode, isAngularHmrEnabled } from './hmr-environment';

const REGISTRY_KEY = '__NS_ANGULAR_HMR_CLASS_REGISTRY__';
const REGISTRY_META_KEY = '__NS_ANGULAR_HMR_CLASS_META__';
const REGISTRAR_HOOK = '__NS_HMR_REGISTER_COMPONENT__';
const REGISTRAR_INSTALLED_FLAG = '__NS_ANGULAR_HMR_REGISTRAR_INSTALLED__';

/**
 * Diagnostic: counters that survive across HMR cycles via globalThis.
 * Used to spot patterns like "the same class registered N times in a
 * single cycle" or "a brand-new class object every cycle".
 */
const DIAG_KEY = '__NS_HMR_DIAG__';
interface DiagSlot {
  [DIAG_KEY]?: {
    cycle: number;
    registerCalls: number;
    classIdentities: Map<string, Set<unknown>>;
    classRegisterCounts: Map<string, number>;
    /** A short id assigned the first time we see a given class object. */
    classIds: WeakMap<object, string>;
    classIdNext: number;
  };
}
function getDiag() {
  const slot = globalThis as unknown as DiagSlot;
  if (!slot[DIAG_KEY]) {
    slot[DIAG_KEY] = {
      cycle: 0,
      registerCalls: 0,
      classIdentities: new Map(),
      classRegisterCounts: new Map(),
      classIds: new WeakMap(),
      classIdNext: 1,
    };
  }
  return slot[DIAG_KEY]!;
}
/** Get/assign a short stable id for a class object. */
function getClassId(diag: ReturnType<typeof getDiag>, cls: object): string {
  let id = diag.classIds.get(cls);
  if (!id) {
    id = `c${diag.classIdNext++}`;
    diag.classIds.set(cls, id);
  }
  return id;
}
function diagLog(message: string): void {
  if (!isAngularHmrEnabled()) return;
  console.info(`[ns-hmr-diag][class-registry] ${message}`);
}
/**
 * Log helper that uses {@link isAngularDevMode} instead of
 * {@link isAngularHmrEnabled} so it fires for messages that *must* be
 * visible at module-load time, before NativeScript Vite's HMR globals
 * have been set. The HMR-globals check would otherwise suppress the
 * "registrar installed" message in the same window we're trying to
 * diagnose. Production builds (`ngDevMode === false`) still skip the
 * log.
 */
function bootLog(message: string): void {
  if (!isAngularDevMode()) return;
  console.info(`[ns-hmr-diag][class-registry] ${message}`);
}
/**
 * Public so callers from application.ts can bump the cycle counter when
 * a new HMR reboot starts. Kept as a free function (not a class method)
 * to avoid forcing more imports on the application module.
 *
 * Self-heal: by the time we hit cycle bump, dev/HMR globals are
 * definitely set (`__NS_HMR_BOOT_COMPLETE__` was set before the first
 * HMR cycle ever runs). Some module-load orderings end up with
 * `installAngularHmrComponentRegistrar()` called before the early
 * placeholder global was set, so the registrar would have returned
 * early and never installed the hook. Re-attempting here closes that
 * window — `installAngularHmrComponentRegistrar()` is idempotent.
 */
export function _hmrDiagBumpCycle(): number {
  const diag = getDiag();
  diag.cycle += 1;
  diagLog(`---- cycle ${diag.cycle} start ----`);
  installAngularHmrComponentRegistrar();
  return diag.cycle;
}
/** Public for tests. */
export function _hmrDiagSnapshot(): { cycle: number; registerCalls: number; namesSeen: number } {
  const diag = getDiag();
  return {
    cycle: diag.cycle,
    registerCalls: diag.registerCalls,
    namesSeen: diag.classIdentities.size,
  };
}

/** Shape of the global registry. Exposed for tests; runtime callers use the helpers below. */
export type HmrClassRegistry = Map<string, unknown>;

/** Optional metadata kept alongside each registered class — currently the source `import.meta.url`. */
export interface HmrClassMeta {
  /** `import.meta.url` of the module that registered the class, or empty string. */
  url: string;
  /** Cycle the registration most recently happened in. */
  cycle: number;
}
export type HmrClassMetaRegistry = Map<string, HmrClassMeta>;

interface GlobalRegistrySlot {
  [REGISTRY_KEY]?: HmrClassRegistry;
  [REGISTRY_META_KEY]?: HmrClassMetaRegistry;
  [REGISTRAR_INSTALLED_FLAG]?: boolean;
  [REGISTRAR_HOOK]?: (name: string, cls: unknown, url?: string) => void;
}

function getRegistry(): HmrClassRegistry {
  const slot = globalThis as unknown as GlobalRegistrySlot;
  let registry = slot[REGISTRY_KEY];
  if (!registry) {
    registry = new Map<string, unknown>();
    slot[REGISTRY_KEY] = registry;
  }
  return registry;
}

function getMetaRegistry(): HmrClassMetaRegistry {
  const slot = globalThis as unknown as GlobalRegistrySlot;
  let registry = slot[REGISTRY_META_KEY];
  if (!registry) {
    registry = new Map<string, HmrClassMeta>();
    slot[REGISTRY_META_KEY] = registry;
  }
  return registry;
}

/**
 * Internal: write a class into the registry. Exposed for unit tests
 * (which can call this directly to simulate a Vite-injected
 * registration without spinning up the Vite plugin pipeline).
 *
 * Production callers should never need this — user code just calls
 * the global `__NS_HMR_REGISTER_COMPONENT__` hook installed by
 * {@link installAngularHmrComponentRegistrar}.
 */
export function _registerComponentForHmr(name: string, cls: unknown, url = ''): void {
  if (!name || typeof name !== 'string') return;
  if (cls === undefined || cls === null) return;

  const registry = getRegistry();
  const meta = getMetaRegistry();
  const previous = registry.get(name);
  registry.set(name, cls);
  meta.set(name, { url: url || '', cycle: getDiag().cycle });

  const d = getDiag();
  d.registerCalls += 1;
  if (typeof cls === 'object' || typeof cls === 'function') {
    const classId = getClassId(d, cls as object);
    let identitySet = d.classIdentities.get(name);
    if (!identitySet) {
      identitySet = new Set<unknown>();
      d.classIdentities.set(name, identitySet);
    }
    identitySet.add(cls);
    d.classRegisterCounts.set(name, (d.classRegisterCounts.get(name) ?? 0) + 1);

    // Only log a small set of "interesting" components to keep noise
    // manageable. Verbose mode is enabled by setting
    // globalThis.__NS_HMR_DIAG_VERBOSE = true (e.g. from the user
    // app's main.ts) when we want all names.
    const verbose = !!(globalThis as { __NS_HMR_DIAG_VERBOSE?: boolean }).__NS_HMR_DIAG_VERBOSE;
    const watchPattern = (globalThis as { __NS_HMR_DIAG_WATCH?: RegExp | string }).__NS_HMR_DIAG_WATCH;
    const matches = watchPattern instanceof RegExp ? watchPattern.test(name) : typeof watchPattern === 'string' ? name.includes(watchPattern) : /Modal|Dialog/.test(name);
    if (verbose || matches) {
      diagLog(
        `register name=${name} classId=${classId} sameAsPrev=${previous === cls} cycle=${d.cycle} totalIdentitiesForName=${identitySet.size} registerCountForName=${d.classRegisterCounts.get(name)} url=${url || '(none)'}`,
      );
    }
  }
}

/**
 * Install the cross-module `__NS_HMR_REGISTER_COMPONENT__` hook on
 * `globalThis`. The Vite plugin `ns-component-hmr-register` injects
 * a call to this hook at the end of every user `.ts` file that
 * defines an `@Component`-decorated class, so re-evaluations after
 * an HMR reboot keep the registry pointed at the live class.
 *
 * Idempotent: calling twice is a no-op (the second call sees the
 * installed flag and returns).
 *
 * The hook is installed unconditionally — it's a single function
 * reference on globalThis with negligible cost. Production builds
 * never reach this code path because the Vite plugin
 * `ns-component-hmr-register` runs only with `apply: 'serve'`, so
 * the hook is never *called* in production. We previously gated
 * this on `isAngularHmrEnabled()` but that check depends on
 * NativeScript Vite globals (`__NS_DEV_PLACEHOLDER_ROOT_EARLY__` /
 * `__NS_HMR_BOOT_COMPLETE__`) that are set imperatively from
 * `main-entry.ts`. Module-load ordering can put `application.ts`
 * evaluation *before* those globals are set in some startup paths,
 * causing the install to silently no-op while the Vite plugin
 * happily emits registration calls into user `.ts` files. The end
 * result was an empty registry and `getFreshComponentClass` always
 * reporting `reason=no-registry`. Removing the gate eliminates
 * that race entirely.
 */
export function installAngularHmrComponentRegistrar(): void {
  const slot = globalThis as unknown as GlobalRegistrySlot;
  if (slot[REGISTRAR_INSTALLED_FLAG]) {
    return;
  }

  // Define the hook BEFORE marking installed so concurrent module
  // initializers see the function as soon as the flag is observable.
  slot[REGISTRAR_HOOK] = (name: string, cls: unknown, url?: string) => {
    try {
      _registerComponentForHmr(name, cls, typeof url === 'string' ? url : '');
    } catch (err) {
      // Registration is best-effort — never break a user module load
      // because of a registration failure.
      diagLog(`registrar threw for ${name}: ${(err as Error)?.message ?? err}`);
    }
  };
  slot[REGISTRAR_INSTALLED_FLAG] = true;

  bootLog('installAngularHmrComponentRegistrar installed global hook __NS_HMR_REGISTER_COMPONENT__');
}

/**
 * Look up the freshest registered component class for a given name, or
 * `undefined` if no match. HMR helpers (e.g. dialog restore) call this
 * with the captured class's `.name` to find the live class after a
 * reboot. Returns `undefined` in production builds because the registrar
 * is never installed there.
 */
export function getFreshComponentClass<T = unknown>(name: string): T | undefined {
  if (!name) return undefined;
  const slot = globalThis as unknown as GlobalRegistrySlot;
  const registry = slot[REGISTRY_KEY];
  // Diagnostics: log every lookup with the resolved class id so the
  // restore path can be cross-referenced against register emissions.
  if (registry) {
    const value = registry.get(name) as T | undefined;
    const diag = getDiag();
    const classId = value && (typeof value === 'object' || typeof value === 'function') ? getClassId(diag, value as unknown as object) : '(none)';
    const knownNames = registry.size;
    diagLog(`getFreshComponentClass name=${name} found=${!!value} classId=${classId} registrySize=${knownNames}`);
    return value;
  }
  diagLog(`getFreshComponentClass name=${name} found=false reason=no-registry`);
  return undefined;
}

/**
 * Look up the source URL (`import.meta.url`) recorded for a registered
 * component. Used by HMR helpers that need to force a fresh import of
 * a lazily-loaded module (e.g. modals whose static import chain doesn't
 * walk the bootstrap path).
 *
 * Returns `undefined` if the name was never registered or if no URL was
 * provided at registration time.
 */
export function getRegisteredComponentUrl(name: string): string | undefined {
  if (!name) return undefined;
  const slot = globalThis as unknown as GlobalRegistrySlot;
  const meta = slot[REGISTRY_META_KEY];
  const entry = meta?.get(name);
  return entry?.url || undefined;
}

/**
 * Test/debug helper: clear all registered classes. Production callers
 * never need this; the registry stays empty without the registrar.
 */
export function clearAngularHmrClassRegistry(): void {
  const slot = globalThis as unknown as GlobalRegistrySlot;
  slot[REGISTRY_KEY] = undefined;
  slot[REGISTRY_META_KEY] = undefined;
  slot[REGISTRAR_INSTALLED_FLAG] = undefined;
  slot[REGISTRAR_HOOK] = undefined;
  // Also reset diag so test isolation isn't broken by counts leaking.
  const diagSlot = globalThis as unknown as DiagSlot;
  diagSlot[DIAG_KEY] = undefined;
}
