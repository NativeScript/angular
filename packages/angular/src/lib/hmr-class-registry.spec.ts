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
  getFreshComponentClass,
  getRegisteredComponentUrl,
  installAngularHmrComponentRegistrar,
} from './hmr-class-registry';

const NG_DEV_MODE_KEY = 'ngDevMode';
const VITE_HMR_SIGNAL_KEY = '__NS_DEV_PLACEHOLDER_ROOT_EARLY__';
const HOOK_KEY = '__NS_HMR_REGISTER_COMPONENT__';

function withDevMode<T>(value: boolean | undefined, run: () => T): T {
  const slot = globalThis as unknown as Record<string, unknown>;
  const previous = slot[NG_DEV_MODE_KEY];
  if (value === undefined) {
    delete slot[NG_DEV_MODE_KEY];
  } else {
    slot[NG_DEV_MODE_KEY] = value;
  }
  try {
    return run();
  } finally {
    if (previous === undefined) {
      delete slot[NG_DEV_MODE_KEY];
    } else {
      slot[NG_DEV_MODE_KEY] = previous;
    }
  }
}

function withViteHmrSignal<T>(active: boolean, run: () => T): T {
  const slot = globalThis as unknown as Record<string, unknown>;
  const previous = slot[VITE_HMR_SIGNAL_KEY];
  if (active) {
    slot[VITE_HMR_SIGNAL_KEY] = true;
  } else {
    delete slot[VITE_HMR_SIGNAL_KEY];
  }
  try {
    return run();
  } finally {
    if (previous === undefined) {
      delete slot[VITE_HMR_SIGNAL_KEY];
    } else {
      slot[VITE_HMR_SIGNAL_KEY] = previous;
    }
  }
}

describe('hmr-class-registry', () => {
  afterEach(() => {
    clearAngularHmrClassRegistry();
  });

  describe('installAngularHmrComponentRegistrar', () => {
    // The registrar installs unconditionally. Production safety comes
    // from the Vite plugin (`apply: 'serve'`), not from a runtime gate
    // on this hook. A previous version short-circuited on
    // `isAngularHmrEnabled()` and that produced a real-world race
    // where `application.ts` evaluated before NativeScript Vite set
    // its HMR globals; the hook was never installed and the registry
    // stayed empty. See the comment block on the function for the
    // full rationale.
    it('installs the global hook in production too (the hook is just never called from there)', () => {
      withDevMode(false, () => {
        installAngularHmrComponentRegistrar();
        const hook = (globalThis as Record<string, unknown>)[HOOK_KEY];
        expect(typeof hook).toBe('function');
      });
    });

    it('installs the global hook even when no HMR signal is active', () => {
      withDevMode(true, () => {
        withViteHmrSignal(false, () => {
          installAngularHmrComponentRegistrar();
          const hook = (globalThis as Record<string, unknown>)[HOOK_KEY];
          expect(typeof hook).toBe('function');
        });
      });
    });

    it('installs the global __NS_HMR_REGISTER_COMPONENT__ hook when vite HMR is active', () => {
      withDevMode(true, () => {
        withViteHmrSignal(true, () => {
          installAngularHmrComponentRegistrar();
          const hook = (globalThis as Record<string, unknown>)[HOOK_KEY];
          expect(typeof hook).toBe('function');
        });
      });
    });

    it('hook registers a class so getFreshComponentClass returns it', () => {
      withDevMode(true, () => {
        withViteHmrSignal(true, () => {
          installAngularHmrComponentRegistrar();
          const hook = (globalThis as Record<string, unknown>)[HOOK_KEY] as (
            name: string,
            cls: unknown,
            url?: string,
          ) => void;
          class FooComponent {}
          hook('FooComponent', FooComponent, 'http://localhost:5173/ns/m/src/foo.component.ts');
          expect(getFreshComponentClass('FooComponent')).toBe(FooComponent);
          expect(getRegisteredComponentUrl('FooComponent')).toBe('http://localhost:5173/ns/m/src/foo.component.ts');
        });
      });
    });

    it('returns the latest registered class on repeated registration calls (HMR reboot scenario)', () => {
      withDevMode(true, () => {
        withViteHmrSignal(true, () => {
          installAngularHmrComponentRegistrar();
          const hook = (globalThis as Record<string, unknown>)[HOOK_KEY] as (
            name: string,
            cls: unknown,
            url?: string,
          ) => void;

          class FooV1 {}
          class FooV2 {}
          Object.defineProperty(FooV1, 'name', { value: 'FooComponent' });
          Object.defineProperty(FooV2, 'name', { value: 'FooComponent' });

          hook('FooComponent', FooV1, '');
          expect(getFreshComponentClass('FooComponent')).toBe(FooV1);

          hook('FooComponent', FooV2, '');
          expect(getFreshComponentClass('FooComponent')).toBe(FooV2);
        });
      });
    });

    it('is idempotent: installing twice does not replace the hook', () => {
      withDevMode(true, () => {
        withViteHmrSignal(true, () => {
          installAngularHmrComponentRegistrar();
          const firstHook = (globalThis as Record<string, unknown>)[HOOK_KEY];
          installAngularHmrComponentRegistrar();
          const secondHook = (globalThis as Record<string, unknown>)[HOOK_KEY];
          expect(secondHook).toBe(firstHook);
        });
      });
    });

    it('survives a simulated HMR reboot — the same global registry stays populated', () => {
      // This is the critical regression test. Before this fix, the
      // registrar patched `ɵɵdefineComponent` on `@angular/core`,
      // and the patch silently failed because the export binding is
      // immutable in ESM. With the new self-registration approach,
      // each component module pushes its fresh class through the
      // global hook on every re-evaluation, so the registry stays
      // current across as many reboots as needed.
      withDevMode(true, () => {
        withViteHmrSignal(true, () => {
          installAngularHmrComponentRegistrar();
          const hook = (globalThis as Record<string, unknown>)[HOOK_KEY] as (
            name: string,
            cls: unknown,
            url?: string,
          ) => void;

          class CycleOne {}
          class CycleTwo {}
          Object.defineProperty(CycleOne, 'name', { value: 'ResourceModalComponent' });
          Object.defineProperty(CycleTwo, 'name', { value: 'ResourceModalComponent' });

          _hmrDiagBumpCycle();
          hook('ResourceModalComponent', CycleOne, '');
          expect(getFreshComponentClass('ResourceModalComponent')).toBe(CycleOne);

          // Simulate an HMR reboot: a brand-new class object with the
          // same source name comes through the hook. The registrar
          // doesn't need to be re-installed; the hook is the same
          // function, but the registry snapshot now points at the
          // fresh class.
          _hmrDiagBumpCycle();
          hook('ResourceModalComponent', CycleTwo, '');
          expect(getFreshComponentClass('ResourceModalComponent')).toBe(CycleTwo);
          expect(_hmrDiagSnapshot().registerCalls).toBe(2);
        });
      });
    });
  });

  describe('_registerComponentForHmr', () => {
    it('skips registration for falsy names', () => {
      class Foo {}
      _registerComponentForHmr('', Foo);
      expect(getFreshComponentClass('')).toBeUndefined();
    });

    it('skips registration for nullish class refs', () => {
      _registerComponentForHmr('Foo', null);
      _registerComponentForHmr('Foo', undefined);
      expect(getFreshComponentClass('Foo')).toBeUndefined();
    });

    it('records the URL alongside the class', () => {
      class Foo {}
      _registerComponentForHmr('Foo', Foo, 'http://localhost:5173/ns/m/foo.ts');
      expect(getRegisteredComponentUrl('Foo')).toBe('http://localhost:5173/ns/m/foo.ts');
    });
  });

  describe('getFreshComponentClass', () => {
    it('returns undefined when no class has been registered', () => {
      expect(getFreshComponentClass('NeverRegistered')).toBeUndefined();
    });

    it('returns undefined for an empty name', () => {
      expect(getFreshComponentClass('')).toBeUndefined();
    });
  });

  describe('getRegisteredComponentUrl', () => {
    it('returns undefined when no class has been registered', () => {
      expect(getRegisteredComponentUrl('NeverRegistered')).toBeUndefined();
    });

    it('returns undefined when registration omitted the URL', () => {
      withDevMode(true, () => {
        withViteHmrSignal(true, () => {
          installAngularHmrComponentRegistrar();
          const hook = (globalThis as Record<string, unknown>)[HOOK_KEY] as (
            name: string,
            cls: unknown,
            url?: string,
          ) => void;
          class Foo {}
          hook('Foo', Foo);
          expect(getFreshComponentClass('Foo')).toBe(Foo);
          expect(getRegisteredComponentUrl('Foo')).toBeUndefined();
        });
      });
    });
  });
});
