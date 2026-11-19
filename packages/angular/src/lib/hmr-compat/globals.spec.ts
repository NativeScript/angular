import { ANGULAR_HMR_GLOBAL_DEPRECATIONS, resetDeprecationWarnings } from './deprecations';
import { AngularHmrCompatGlobalsDeps, defineAngularHmrCompatGlobals } from './globals';

type Target = Record<string, any>;

function install(target: Target = {}) {
  const deps: AngularHmrCompatGlobalsDeps & Record<string, jest.Mock> = {
    resetCompiledComponents: jest.fn(),
    rebootInPlace: jest.fn(() => true),
    registerComponent: jest.fn(),
    legacyState: jest.fn(() => ({ route: { restoring: '/home' } })),
    warn: jest.fn(),
  };
  defineAngularHmrCompatGlobals(target, deps);
  return { target, deps };
}

describe('Angular HMR compat globals', () => {
  beforeEach(() => resetDeprecationWarnings());

  it('defines every deprecated global', () => {
    const { target } = install();
    for (const name of Object.keys(ANGULAR_HMR_GLOBAL_DEPRECATIONS)) {
      expect(name in target).toBe(true);
    }
  });

  it('forwards to the replacements and warns once per global', () => {
    const { target, deps } = install();
    target.__reboot_ng_modules__(true);
    target.__reboot_ng_modules__();
    target.__reset_ng_compiled_components__();
    const Cls = class {};
    target.__NS_HMR_REGISTER_COMPONENT__('Cls', Cls);
    expect(target.__NS_NG_HMR__.route.restoring).toBe('/home');
    expect(target.__NS_ANGULAR_HMR_REGISTER_ONLY__).toBe(false);
    target.__NS_ANGULAR_HMR_REGISTER_ONLY__ = true;
    expect(target.__NS_ANGULAR_HMR_REGISTER_ONLY__).toBe(false);
    expect(target.__NS_UPDATE_ANGULAR_APP_OPTIONS__({})).toBeUndefined();
    target.__cleanup_ng_hot__();

    expect(deps.rebootInPlace.mock.calls).toEqual([[true], [false]]);
    expect(deps.resetCompiledComponents).toHaveBeenCalledTimes(1);
    expect(deps.registerComponent).toHaveBeenCalledWith('Cls', Cls);
    expect(deps.warn.mock.calls).toEqual(
      [
        '__reboot_ng_modules__',
        '__reset_ng_compiled_components__',
        '__NS_HMR_REGISTER_COMPONENT__',
        '__NS_NG_HMR__',
        '__NS_ANGULAR_HMR_REGISTER_ONLY__',
        '__NS_UPDATE_ANGULAR_APP_OPTIONS__',
        '__cleanup_ng_hot__',
      ].map((name) => [ANGULAR_HMR_GLOBAL_DEPRECATIONS[name as keyof typeof ANGULAR_HMR_GLOBAL_DEPRECATIONS]]),
    );
  });

  it('leaves globals defined by something else, and installs once per target', () => {
    const webpackReboot = jest.fn();
    const { target, deps } = install({ __reboot_ng_modules__: webpackReboot });
    expect(target.__reboot_ng_modules__).toBe(webpackReboot);
    const first = target.__cleanup_ng_hot__;
    defineAngularHmrCompatGlobals(target, deps);
    expect(target.__cleanup_ng_hot__).toBe(first);
  });
});
