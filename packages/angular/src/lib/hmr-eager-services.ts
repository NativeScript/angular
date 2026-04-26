import type { Injector } from '@angular/core';

/**
 * Registry for HMR-aware services that need to be eagerly instantiated
 * after each Angular bootstrap so they can attach long-lived subscriptions
 * (e.g. to `postAngularBootstrap$`) before the user's app code starts
 * interacting with the new module realm.
 *
 * The registry lives on `globalThis` so consumers in different module
 * realms — including pre-bundled vendor copies of this package — can
 * register the same callback set without depending on import order. The
 * registry is **idempotent**: registering the same function reference
 * twice is a no-op.
 *
 * Production usage is gated by callers (see `dialog-services.ts`'s
 * `isAngularHmrEnabled()` check) so registrations never accumulate in
 * shipping builds.
 *
 * Failure handling: `runHmrEagerInstantiators` swallows per-callback
 * exceptions intentionally. A buggy registrant must never abort
 * bootstrap. The handler can return diagnostics via the optional
 * `onError` parameter so the application module can route failures to
 * the bootstrap log channel instead of silently dropping them.
 */
export type HmrEagerInstantiator = (injector: Injector) => void;

const REGISTRY_KEY = '__NS_HMR_EAGER_SERVICES__';
const REGISTER_KEY = '__NS_REGISTER_HMR_EAGER_SERVICE__';

/**
 * Diagnostic: gate logging behind the same dev-only flag callers
 * already use to decide whether to register at all. Production
 * registrations are no-ops, so production log paths stay silent.
 */
function eagerDiag(message: string): void {
  // We can't import isAngularHmrEnabled here without creating a
  // circular import (hmr-eager-services <- dialog-services <-
  // application <- hmr-eager-services). Instead, key off the same
  // globals isAngularHmrEnabled checks (kept inline for layering).
  const g = globalThis as { __NS_DEV_PLACEHOLDER_ROOT_EARLY__?: unknown; __NS_HMR_BOOT_COMPLETE__?: unknown; ngDevMode?: boolean };
  const ngDev = (typeof g.ngDevMode === 'boolean') ? g.ngDevMode : true;
  const viteHmr = !!g.__NS_DEV_PLACEHOLDER_ROOT_EARLY__ || !!g.__NS_HMR_BOOT_COMPLETE__;
  if (!(ngDev && viteHmr)) return;
  console.info(`[ns-hmr-diag][eager] ${message}`);
}

interface HmrEagerGlobals {
  [REGISTRY_KEY]?: HmrEagerInstantiator[];
  [REGISTER_KEY]?: (fn: HmrEagerInstantiator) => void;
}

function getStore(): HmrEagerGlobals {
  return globalThis as unknown as HmrEagerGlobals;
}

/**
 * Returns the live (mutable) array of registered eager instantiators.
 * Callers must not mutate it directly outside of the helpers in this
 * module — use {@link registerHmrEagerInstantiator} or
 * {@link clearHmrEagerInstantiators} instead.
 */
export function getRegisteredHmrEagerInstantiators(): HmrEagerInstantiator[] {
  const store = getStore();
  const list = store[REGISTRY_KEY];
  if (!Array.isArray(list)) {
    const fresh: HmrEagerInstantiator[] = [];
    store[REGISTRY_KEY] = fresh;
    return fresh;
  }
  return list;
}

/**
 * Idempotently register an instantiator callback. Returns `true` when the
 * callback was added, `false` when it was already present.
 */
export function registerHmrEagerInstantiator(fn: HmrEagerInstantiator): boolean {
  if (typeof fn !== 'function') {
    return false;
  }
  const list = getRegisteredHmrEagerInstantiators();
  if (list.includes(fn)) {
    eagerDiag(`registerHmrEagerInstantiator dedup (already present) listSize=${list.length}`);
    return false;
  }
  list.push(fn);
  eagerDiag(`registerHmrEagerInstantiator added newSize=${list.length} fnName=${fn.name || '(anon)'}`);
  return true;
}

/**
 * Clear all registered instantiators. Tests use this to reset state
 * between specs; production code should not call it.
 */
export function clearHmrEagerInstantiators(): void {
  const list = getRegisteredHmrEagerInstantiators();
  list.length = 0;
}

/**
 * Install the cross-module registration entry point on `globalThis` so
 * consumer modules (e.g. `dialog-services.ts`) can register without
 * statically importing this file. Idempotent across multiple calls so
 * application.ts can call it on every reboot without leaking state.
 */
export function installHmrEagerRegistrar(): void {
  const store = getStore();
  if (typeof store[REGISTER_KEY] === 'function') {
    return;
  }
  store[REGISTER_KEY] = (fn: HmrEagerInstantiator) => {
    registerHmrEagerInstantiator(fn);
  };
}

/**
 * Invoke every registered instantiator with the bootstrapped injector.
 * Per-callback exceptions are swallowed; pass `onError` to receive them
 * for logging.
 */
export function runHmrEagerInstantiators(
  injector: Injector | null | undefined,
  onError?: (err: unknown) => void,
): void {
  if (!injector) {
    eagerDiag(`runHmrEagerInstantiators called without injector — no-op`);
    return;
  }
  const list = getRegisteredHmrEagerInstantiators();
  eagerDiag(`runHmrEagerInstantiators list.length=${list.length}`);
  if (list.length === 0) {
    return;
  }
  for (let i = 0; i < list.length; i++) {
    const fn = list[i];
    try {
      eagerDiag(`runHmrEagerInstantiators calling [${i}] ${fn.name || '(anon)'}`);
      fn(injector);
    } catch (err) {
      eagerDiag(`runHmrEagerInstantiators [${i}] threw: ${(err as Error)?.message ?? err}`);
      if (onError) {
        try {
          onError(err);
        } catch {
          // The error reporter must not itself break the loop.
        }
      }
    }
  }
}
