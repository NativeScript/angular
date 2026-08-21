jest.mock('@nativescript/core', () => ({
  Trace: {
    isEnabled: jest.fn(() => false),
    isCategorySet: jest.fn(() => false),
    write: jest.fn(),
    error: jest.fn(),
    messageType: { log: 0, info: 1, warn: 2, error: 3 },
    categories: { Style: 'NativeScript.Style' },
  },
}));

import {
  _hmrDiagBumpCycle,
  _hmrDiagSnapshot,
  _registerComponentForHmr,
  clearAngularHmrClassRegistry,
  clearHmrEagerInstantiators,
  getAngularCoreForHmrReset,
  getFreshComponentClass,
  getRegisteredHmrEagerInstantiators,
  HmrEagerInstantiator,
  installAngularHmrComponentRegistrar,
  isAngularDevMode,
  isAngularHmrEnabled,
  isNativeScriptViteHmrActive,
  isWebpackHmrActive,
  registerHmrEagerInstantiator,
  rememberAngularCoreForHmr,
  resetAngularHmrCompiledComponents,
  runHmrEagerInstantiators,
  setAngularCoreForHmr,
} from './hmr';

interface MutableGlobal {
  ngDevMode?: boolean;
  __NS_DEV_PLACEHOLDER_ROOT_EARLY__?: unknown;
  __NS_HMR_BOOT_COMPLETE__?: unknown;
  __webpack_require__?: unknown;
}

const HOOK_KEY = '__NS_HMR_REGISTER_COMPONENT__';

describe('hmr environment', () => {
  const g = globalThis as unknown as MutableGlobal;
  let originalNgDevModeDefined = false;
  let originalNgDevModeValue: boolean | undefined;
  let originalPlaceholderFlag: unknown;
  let originalBootCompleteFlag: unknown;
  let originalWebpackRequire: unknown;

  beforeEach(() => {
    originalNgDevModeDefined = Object.prototype.hasOwnProperty.call(g, 'ngDevMode');
    originalNgDevModeValue = g.ngDevMode;
    originalPlaceholderFlag = g.__NS_DEV_PLACEHOLDER_ROOT_EARLY__;
    originalBootCompleteFlag = g.__NS_HMR_BOOT_COMPLETE__;
    originalWebpackRequire = g.__webpack_require__;
  });

  afterEach(() => {
    if (originalNgDevModeDefined) {
      g.ngDevMode = originalNgDevModeValue;
    } else {
      delete g.ngDevMode;
    }
    if (originalPlaceholderFlag === undefined) {
      delete g.__NS_DEV_PLACEHOLDER_ROOT_EARLY__;
    } else {
      g.__NS_DEV_PLACEHOLDER_ROOT_EARLY__ = originalPlaceholderFlag;
    }
    if (originalBootCompleteFlag === undefined) {
      delete g.__NS_HMR_BOOT_COMPLETE__;
    } else {
      g.__NS_HMR_BOOT_COMPLETE__ = originalBootCompleteFlag;
    }
    if (originalWebpackRequire === undefined) {
      delete g.__webpack_require__;
    } else {
      g.__webpack_require__ = originalWebpackRequire;
    }
  });

  it('treats undefined ngDevMode as dev', () => {
    delete g.ngDevMode;
    expect(isAngularDevMode()).toBe(true);
  });

  it('returns false in production even when HMR flags are set', () => {
    g.ngDevMode = false;
    g.__NS_DEV_PLACEHOLDER_ROOT_EARLY__ = true;
    g.__NS_HMR_BOOT_COMPLETE__ = true;
    g.__webpack_require__ = () => undefined;
    expect(isAngularHmrEnabled()).toBe(false);
  });

  it('detects the Vite early placeholder and the post-boot complete flag', () => {
    delete g.ngDevMode;
    delete g.__NS_DEV_PLACEHOLDER_ROOT_EARLY__;
    delete g.__NS_HMR_BOOT_COMPLETE__;
    delete g.__webpack_require__;
    expect(isNativeScriptViteHmrActive()).toBe(false);

    g.__NS_DEV_PLACEHOLDER_ROOT_EARLY__ = true;
    expect(isNativeScriptViteHmrActive()).toBe(true);
    expect(isAngularHmrEnabled()).toBe(true);

    delete g.__NS_DEV_PLACEHOLDER_ROOT_EARLY__;
    g.__NS_HMR_BOOT_COMPLETE__ = true;
    expect(isNativeScriptViteHmrActive()).toBe(true);
    expect(isAngularHmrEnabled()).toBe(true);
  });

  it('detects webpack HMR via __webpack_require__', () => {
    delete g.ngDevMode;
    delete g.__NS_DEV_PLACEHOLDER_ROOT_EARLY__;
    delete g.__NS_HMR_BOOT_COMPLETE__;
    delete g.__webpack_require__;
    expect(isWebpackHmrActive()).toBe(false);
    expect(isAngularHmrEnabled()).toBe(false);

    g.__webpack_require__ = () => undefined;
    expect(isWebpackHmrActive()).toBe(true);
    expect(isAngularHmrEnabled()).toBe(true);

    g.__webpack_require__ = 'not-a-function' as unknown as object;
    expect(isWebpackHmrActive()).toBe(false);
  });
});

describe('hmr class registry', () => {
  afterEach(() => {
    clearAngularHmrClassRegistry();
  });

  it('installs the registrar unconditionally and is idempotent', () => {
    installAngularHmrComponentRegistrar();
    const first = (globalThis as Record<string, unknown>)[HOOK_KEY];
    expect(typeof first).toBe('function');
    installAngularHmrComponentRegistrar();
    expect((globalThis as Record<string, unknown>)[HOOK_KEY]).toBe(first);
  });

  it('keeps the latest class identity across reboot registrations', () => {
    installAngularHmrComponentRegistrar();
    const hook = (globalThis as Record<string, unknown>)[HOOK_KEY] as (name: string, cls: unknown) => void;
    class FooV1 {}
    class FooV2 {}
    hook('FooComponent', FooV1);
    expect(getFreshComponentClass('FooComponent')).toBe(FooV1);
    hook('FooComponent', FooV2);
    expect(getFreshComponentClass('FooComponent')).toBe(FooV2);
  });

  it('skips invalid registrations and empty lookups', () => {
    class Foo {}
    _registerComponentForHmr('', Foo);
    _registerComponentForHmr('Foo', null);
    expect(getFreshComponentClass('')).toBeUndefined();
    expect(getFreshComponentClass('Foo')).toBeUndefined();
    expect(getFreshComponentClass('NeverRegistered')).toBeUndefined();
  });

  it('survives a simulated reboot via the same global hook', () => {
    installAngularHmrComponentRegistrar();
    const hook = (globalThis as Record<string, unknown>)[HOOK_KEY] as (name: string, cls: unknown) => void;
    class CycleOne {}
    class CycleTwo {}
    _hmrDiagBumpCycle();
    hook('ResourceModalComponent', CycleOne);
    expect(getFreshComponentClass('ResourceModalComponent')).toBe(CycleOne);
    _hmrDiagBumpCycle();
    hook('ResourceModalComponent', CycleTwo);
    expect(getFreshComponentClass('ResourceModalComponent')).toBe(CycleTwo);
    expect(_hmrDiagSnapshot().registerCalls).toBe(2);
  });
});

describe('hmr eager services', () => {
  beforeEach(() => {
    clearHmrEagerInstantiators();
  });

  it('registers callbacks once and runs them with the injector', () => {
    const calls: unknown[] = [];
    const fn: HmrEagerInstantiator = (injector) => calls.push(injector);
    expect(registerHmrEagerInstantiator(fn)).toBe(true);
    expect(registerHmrEagerInstantiator(fn)).toBe(false);
    expect(registerHmrEagerInstantiator('nope' as unknown as HmrEagerInstantiator)).toBe(false);
    const injector = { id: 'fake' } as unknown as Parameters<HmrEagerInstantiator>[0];
    runHmrEagerInstantiators(injector);
    expect(calls).toEqual([injector]);
    expect(getRegisteredHmrEagerInstantiators()).toEqual([fn]);
  });

  it('continues after a callback throws and ignores reporter failures', () => {
    const survivors: string[] = [];
    const errors: unknown[] = [];
    registerHmrEagerInstantiator(() => survivors.push('first'));
    registerHmrEagerInstantiator(() => {
      throw new Error('boom');
    });
    registerHmrEagerInstantiator(() => survivors.push('third'));
    runHmrEagerInstantiators({} as Parameters<HmrEagerInstantiator>[0], (err) => errors.push(err));
    expect(survivors).toEqual(['first', 'third']);
    expect((errors[0] as Error).message).toBe('boom');

    clearHmrEagerInstantiators();
    registerHmrEagerInstantiator(() => {
      throw new Error('first failure');
    });
    registerHmrEagerInstantiator(() => survivors.push('second ran'));
    expect(() =>
      runHmrEagerInstantiators({} as Parameters<HmrEagerInstantiator>[0], () => {
        throw new Error('reporter blew up');
      }),
    ).not.toThrow();
    expect(survivors).toContain('second ran');
  });

  it('is a no-op without an injector', () => {
    expect(() => runHmrEagerInstantiators(undefined)).not.toThrow();
    expect(() => runHmrEagerInstantiators(null)).not.toThrow();
  });
});

describe('hmr compiled component reset', () => {
  it('calls Angular reset when available and swallows failures', () => {
    const core = { ɵresetCompiledComponents: jest.fn() };
    expect(resetAngularHmrCompiledComponents(core)).toBe(true);
    expect(core.ɵresetCompiledComponents).toHaveBeenCalledTimes(1);
    expect(resetAngularHmrCompiledComponents({})).toBe(false);
    const exploding = {
      ɵresetCompiledComponents: jest.fn(() => {
        throw new Error('boom');
      }),
    };
    expect(resetAngularHmrCompiledComponents(exploding)).toBe(false);
  });

  it('remembers the first Angular core and allows an explicit replace', () => {
    const originalCore = { ɵresetCompiledComponents: jest.fn() };
    const replacementCore = { ɵresetCompiledComponents: jest.fn() };
    const globalObj: any = {};
    expect(rememberAngularCoreForHmr(originalCore, globalObj)).toBe(originalCore);
    expect(rememberAngularCoreForHmr(replacementCore, globalObj)).toBe(originalCore);
    expect(getAngularCoreForHmrReset(replacementCore, globalObj)).toBe(originalCore);
    expect(setAngularCoreForHmr(replacementCore, globalObj)).toBe(replacementCore);
  });
});
