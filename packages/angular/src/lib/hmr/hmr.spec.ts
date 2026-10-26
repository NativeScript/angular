const resetCompiledComponents = jest.fn();
jest.mock('@angular/core', () => ({ ɵresetCompiledComponents: () => resetCompiledComponents() }));
jest.mock('../trace', () => ({
  NativeScriptDebug: { isLogEnabled: () => false, hmrLog: jest.fn(), hmrLogError: jest.fn() },
}));

import {
  getHmrComponentClass,
  handOffHmrAppOptions,
  hmrState,
  installViteHmrGlobals,
  registerHmrHooks,
  runHmrHooks,
} from './hmr';

const g = globalThis as Record<string, any>;
const injector = {} as any;

afterEach(() => {
  for (const key of [
    '__NS_NG_HMR__',
    '__NS_ANGULAR_HMR_REGISTER_ONLY__',
    '__NS_UPDATE_ANGULAR_APP_OPTIONS__',
    '__reset_ng_compiled_components__',
    '__NS_HMR_REGISTER_COMPONENT__',
  ]) {
    delete g[key];
  }
});

describe('hmr hooks', () => {
  it('runs every registered hook for a phase and isolates failures', () => {
    const calls: string[] = [];
    registerHmrHooks('a', {
      beforeDispose: () => {
        throw new Error('boom');
      },
    });
    registerHmrHooks('b', { beforeDispose: () => calls.push('b'), afterBootstrap: () => calls.push('b:after') });

    runHmrHooks('beforeDispose', injector);

    expect(calls).toEqual(['b']);
  });

  it('replaces hooks registered under the same name', () => {
    const first = jest.fn();
    const second = jest.fn();
    registerHmrHooks('x', { afterBootstrap: first });
    registerHmrHooks('x', { afterBootstrap: second });

    runHmrHooks('afterBootstrap', injector);

    expect(first).not.toHaveBeenCalled();
    expect(second).toHaveBeenCalledWith(injector);
  });

  it('skips hooks without an injector', () => {
    const hook = jest.fn();
    registerHmrHooks('x', { beforeDispose: hook });
    runHmrHooks('beforeDispose', null);
    expect(hook).not.toHaveBeenCalled();
  });
});

describe('vite globals', () => {
  it('hands options to the running app only while Vite re-imports the entry', () => {
    const update = jest.fn();
    installViteHmrGlobals(update);

    expect(handOffHmrAppOptions({ a: 1 })).toBe(false);
    g.__NS_ANGULAR_HMR_REGISTER_ONLY__ = true;
    expect(handOffHmrAppOptions({ a: 2 })).toBe(true);
    expect(update).toHaveBeenCalledWith({ a: 2 });
  });

  it('registers the latest component class by name and resets compiled components', () => {
    class Old {}
    class Fresh {}
    installViteHmrGlobals(jest.fn());

    g.__NS_HMR_REGISTER_COMPONENT__('Cmp', Old);
    g.__NS_HMR_REGISTER_COMPONENT__('Cmp', Fresh);
    g.__reset_ng_compiled_components__();

    expect(getHmrComponentClass('Cmp')).toBe(Fresh);
    expect(resetCompiledComponents).toHaveBeenCalledTimes(1);
    expect(hmrState().components.size).toBe(1);
  });
});
