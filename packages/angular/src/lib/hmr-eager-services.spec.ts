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
  clearHmrEagerInstantiators,
  getRegisteredHmrEagerInstantiators,
  HmrEagerInstantiator,
  installHmrEagerRegistrar,
  registerHmrEagerInstantiator,
  runHmrEagerInstantiators,
} from './hmr-eager-services';

const REGISTRY_KEY = '__NS_HMR_EAGER_SERVICES__';
const REGISTER_KEY = '__NS_REGISTER_HMR_EAGER_SERVICE__';

interface TestGlobals {
  [REGISTRY_KEY]?: HmrEagerInstantiator[];
  [REGISTER_KEY]?: ((fn: HmrEagerInstantiator) => void) | undefined;
}

function getTestGlobals(): TestGlobals {
  return globalThis as unknown as TestGlobals;
}

describe('HMR eager-services registry', () => {
  beforeEach(() => {
    // Reset the global state between specs so each test starts from a
    // clean slate. We can't `delete` from `globalThis` reliably across
    // engines, but emptying the array + clearing the registrar gives the
    // same observable behavior to the helpers under test.
    clearHmrEagerInstantiators();
    getTestGlobals()[REGISTER_KEY] = undefined;
  });

  describe('registerHmrEagerInstantiator', () => {
    it('appends the callback and returns true when newly registered', () => {
      const fn: HmrEagerInstantiator = jest.fn();

      const wasAdded = registerHmrEagerInstantiator(fn);

      expect(wasAdded).toBe(true);
      expect(getRegisteredHmrEagerInstantiators()).toContain(fn);
    });

    it('is idempotent: registering the same function twice keeps a single entry', () => {
      const fn: HmrEagerInstantiator = jest.fn();

      registerHmrEagerInstantiator(fn);
      const wasAddedAgain = registerHmrEagerInstantiator(fn);

      expect(wasAddedAgain).toBe(false);
      expect(getRegisteredHmrEagerInstantiators().filter((entry) => entry === fn)).toHaveLength(1);
    });

    it('refuses non-function values so a buggy globalThis cast cannot poison the registry', () => {
      const wasAdded = registerHmrEagerInstantiator('not a function' as unknown as HmrEagerInstantiator);

      expect(wasAdded).toBe(false);
      expect(getRegisteredHmrEagerInstantiators()).toHaveLength(0);
    });
  });

  describe('runHmrEagerInstantiators', () => {
    it('invokes every registered callback with the bootstrapped injector', () => {
      const calls: unknown[] = [];
      const fn1: HmrEagerInstantiator = (injector) => calls.push(['fn1', injector]);
      const fn2: HmrEagerInstantiator = (injector) => calls.push(['fn2', injector]);
      registerHmrEagerInstantiator(fn1);
      registerHmrEagerInstantiator(fn2);

      const injector = { id: 'fake-injector' } as unknown as Parameters<HmrEagerInstantiator>[0];
      runHmrEagerInstantiators(injector);

      expect(calls).toEqual([
        ['fn1', injector],
        ['fn2', injector],
      ]);
    });

    it('continues running remaining callbacks when one throws', () => {
      const survivors: string[] = [];
      const errors: unknown[] = [];
      registerHmrEagerInstantiator(() => {
        survivors.push('first');
      });
      registerHmrEagerInstantiator(() => {
        throw new Error('boom');
      });
      registerHmrEagerInstantiator(() => {
        survivors.push('third');
      });

      runHmrEagerInstantiators({} as Parameters<HmrEagerInstantiator>[0], (err) => errors.push(err));

      expect(survivors).toEqual(['first', 'third']);
      expect(errors).toHaveLength(1);
      expect((errors[0] as Error).message).toBe('boom');
    });

    it('ignores errors thrown by the onError reporter so a logging bug does not abort the loop', () => {
      const survivors: string[] = [];
      registerHmrEagerInstantiator(() => {
        throw new Error('first failure');
      });
      registerHmrEagerInstantiator(() => {
        survivors.push('second ran');
      });

      expect(() =>
        runHmrEagerInstantiators({} as Parameters<HmrEagerInstantiator>[0], () => {
          throw new Error('reporter blew up');
        }),
      ).not.toThrow();

      expect(survivors).toEqual(['second ran']);
    });

    it('is a safe no-op when the injector is missing or the registry is empty', () => {
      expect(() => runHmrEagerInstantiators(undefined)).not.toThrow();
      expect(() => runHmrEagerInstantiators(null)).not.toThrow();

      registerHmrEagerInstantiator(jest.fn());
      expect(() => runHmrEagerInstantiators(undefined)).not.toThrow();
    });
  });

  describe('installHmrEagerRegistrar', () => {
    it('installs a global hook that delegates to registerHmrEagerInstantiator', () => {
      installHmrEagerRegistrar();

      const hook = getTestGlobals()[REGISTER_KEY];
      expect(typeof hook).toBe('function');

      const fn: HmrEagerInstantiator = jest.fn();
      hook?.(fn);

      expect(getRegisteredHmrEagerInstantiators()).toContain(fn);
    });

    it('is idempotent across multiple calls so HMR re-evaluations do not replace the live hook', () => {
      installHmrEagerRegistrar();
      const first = getTestGlobals()[REGISTER_KEY];

      installHmrEagerRegistrar();
      const second = getTestGlobals()[REGISTER_KEY];

      expect(second).toBe(first);
    });

    it('the global hook ignores non-function arguments', () => {
      installHmrEagerRegistrar();
      const hook = getTestGlobals()[REGISTER_KEY];

      expect(() => hook?.(undefined as unknown as HmrEagerInstantiator)).not.toThrow();
      expect(getRegisteredHmrEagerInstantiators()).toHaveLength(0);
    });
  });
});
