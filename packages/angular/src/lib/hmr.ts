import type { Injector } from '@angular/core';
import { NativeScriptDebug } from './trace';

declare const ngDevMode: boolean | undefined;

type AngularCoreWithCompiledComponentReset = {
  ɵresetCompiledComponents?: () => void;
};

type AngularCoreHolder = {
  __NS_ANGULAR_CORE__?: AngularCoreWithCompiledComponentReset | null;
};

export function isAngularDevMode(): boolean {
  if (typeof ngDevMode === 'undefined') {
    return true;
  }
  return ngDevMode !== false;
}

export function isNativeScriptViteHmrActive(): boolean {
  const g = globalThis as {
    __NS_DEV_PLACEHOLDER_ROOT_EARLY__?: unknown;
    __NS_HMR_BOOT_COMPLETE__?: unknown;
  };
  return !!(g.__NS_DEV_PLACEHOLDER_ROOT_EARLY__ || g.__NS_HMR_BOOT_COMPLETE__);
}

export function isWebpackHmrActive(): boolean {
  return typeof (globalThis as { __webpack_require__?: unknown }).__webpack_require__ === 'function';
}

/**
 * True in Angular dev when Vite or webpack HMR is active.
 */
export function isAngularHmrEnabled(): boolean {
  if (typeof ngDevMode !== 'undefined' && ngDevMode === false) {
    return false;
  }
  return isNativeScriptViteHmrActive() || isWebpackHmrActive();
}

export function setAngularCoreForHmr(
  core: AngularCoreWithCompiledComponentReset | null | undefined,
  globalObj: AngularCoreHolder = globalThis as AngularCoreHolder,
): AngularCoreWithCompiledComponentReset | null | undefined {
  if (core) {
    globalObj.__NS_ANGULAR_CORE__ = core;
  }
  return getAngularCoreForHmrReset(core, globalObj);
}

export function getAngularCoreForHmrReset(
  core: AngularCoreWithCompiledComponentReset | null | undefined,
  globalObj: AngularCoreHolder = globalThis as AngularCoreHolder,
): AngularCoreWithCompiledComponentReset | null | undefined {
  return globalObj.__NS_ANGULAR_CORE__ || core;
}

export function rememberAngularCoreForHmr(
  core: AngularCoreWithCompiledComponentReset | null | undefined,
  globalObj: AngularCoreHolder = globalThis as AngularCoreHolder,
): AngularCoreWithCompiledComponentReset | null | undefined {
  if (!globalObj.__NS_ANGULAR_CORE__ && core) {
    globalObj.__NS_ANGULAR_CORE__ = core;
  }
  return getAngularCoreForHmrReset(core, globalObj);
}

export function resetAngularHmrCompiledComponents(core: AngularCoreWithCompiledComponentReset | null | undefined): boolean {
  const resetCompiledComponents = core?.ɵresetCompiledComponents;
  if (typeof resetCompiledComponents !== 'function') {
    return false;
  }
  try {
    resetCompiledComponents.call(core);
    return true;
  } catch {
    return false;
  }
}

const REGISTRY_KEY = '__NS_ANGULAR_HMR_CLASS_REGISTRY__';
const REGISTRAR_HOOK = '__NS_HMR_REGISTER_COMPONENT__';
const REGISTRAR_INSTALLED_FLAG = '__NS_ANGULAR_HMR_REGISTRAR_INSTALLED__';
const DIAG_KEY = '__NS_HMR_DIAG__';

type HmrClassRegistry = Map<string, unknown>;

interface DiagSlot {
  [DIAG_KEY]?: {
    cycle: number;
    registerCalls: number;
  };
}

interface GlobalRegistrySlot {
  [REGISTRY_KEY]?: HmrClassRegistry;
  [REGISTRAR_INSTALLED_FLAG]?: boolean;
  [REGISTRAR_HOOK]?: (name: string, cls: unknown, url?: string) => void;
}

function getDiag() {
  const slot = globalThis as unknown as DiagSlot;
  if (!slot[DIAG_KEY]) {
    slot[DIAG_KEY] = { cycle: 0, registerCalls: 0 };
  }
  return slot[DIAG_KEY]!;
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

export function _registerComponentForHmr(name: string, cls: unknown, _url = ''): void {
  if (!name || typeof name !== 'string') {
    return;
  }
  if (cls === undefined || cls === null) {
    return;
  }
  getRegistry().set(name, cls);
  getDiag().registerCalls += 1;
}

/**
 * Install `__NS_HMR_REGISTER_COMPONENT__` for Vite class identity updates.
 */
export function installAngularHmrComponentRegistrar(): void {
  const slot = globalThis as unknown as GlobalRegistrySlot;
  if (slot[REGISTRAR_INSTALLED_FLAG]) {
    return;
  }
  slot[REGISTRAR_HOOK] = (name: string, cls: unknown, url?: string) => {
    try {
      _registerComponentForHmr(name, cls, typeof url === 'string' ? url : '');
    } catch (err) {
      if (isAngularHmrEnabled() && NativeScriptDebug.isLogEnabled()) {
        NativeScriptDebug.hmrLog(`[class-registry] registrar threw for ${name}: ${(err as Error)?.message ?? err}`);
      }
    }
  };
  slot[REGISTRAR_INSTALLED_FLAG] = true;
}

export function getFreshComponentClass<T = unknown>(name: string): T | undefined {
  if (!name) {
    return undefined;
  }
  const registry = (globalThis as unknown as GlobalRegistrySlot)[REGISTRY_KEY];
  return registry?.get(name) as T | undefined;
}

export function _hmrDiagBumpCycle(): number {
  const diag = getDiag();
  diag.cycle += 1;
  installAngularHmrComponentRegistrar();
  return diag.cycle;
}

export function _hmrDiagSnapshot(): { cycle: number; registerCalls: number } {
  const diag = getDiag();
  return { cycle: diag.cycle, registerCalls: diag.registerCalls };
}

export function clearAngularHmrClassRegistry(): void {
  const slot = globalThis as unknown as GlobalRegistrySlot;
  slot[REGISTRY_KEY] = undefined;
  slot[REGISTRAR_INSTALLED_FLAG] = undefined;
  slot[REGISTRAR_HOOK] = undefined;
  (globalThis as unknown as DiagSlot)[DIAG_KEY] = undefined;
}

export type HmrEagerInstantiator = (injector: Injector) => void;

const EAGER_REGISTRY_KEY = '__NS_HMR_EAGER_SERVICES__';

interface HmrEagerGlobals {
  [EAGER_REGISTRY_KEY]?: HmrEagerInstantiator[];
}

export function getRegisteredHmrEagerInstantiators(): HmrEagerInstantiator[] {
  const store = globalThis as unknown as HmrEagerGlobals;
  const list = store[EAGER_REGISTRY_KEY];
  if (!Array.isArray(list)) {
    const fresh: HmrEagerInstantiator[] = [];
    store[EAGER_REGISTRY_KEY] = fresh;
    return fresh;
  }
  return list;
}

export function registerHmrEagerInstantiator(fn: HmrEagerInstantiator): boolean {
  if (typeof fn !== 'function') {
    return false;
  }
  const list = getRegisteredHmrEagerInstantiators();
  if (list.includes(fn)) {
    return false;
  }
  list.push(fn);
  return true;
}

export function clearHmrEagerInstantiators(): void {
  getRegisteredHmrEagerInstantiators().length = 0;
}

export function runHmrEagerInstantiators(injector: Injector | null | undefined, onError?: (err: unknown) => void): void {
  if (!injector) {
    return;
  }
  const list = getRegisteredHmrEagerInstantiators();
  for (let i = 0; i < list.length; i++) {
    try {
      list[i](injector);
    } catch (err) {
      if (onError) {
        try {
          onError(err);
        } catch {
          // ignore
        }
      }
    }
  }
}
