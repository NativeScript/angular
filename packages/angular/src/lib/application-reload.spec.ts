import { resolveAngularAppSessionAction } from './application-reload';

describe('resolveAngularAppSessionAction', () => {
  it('uses the HMR register-only path when the updater is already installed', () => {
    expect(
      resolveAngularAppSessionAction(
        {
          __NS_ANGULAR_HMR_REGISTER_ONLY__: true,
          __NS_UPDATE_ANGULAR_APP_OPTIONS__: () => undefined,
          __reboot_ng_modules__: () => undefined,
        },
        true,
      ),
    ).toBe('register-only');
  });

  it('does not treat register-only as authoritative without an updater', () => {
    expect(
      resolveAngularAppSessionAction(
        {
          __NS_ANGULAR_HMR_REGISTER_ONLY__: true,
          __reboot_ng_modules__: () => undefined,
        },
        true,
      ),
    ).toBe('reboot-existing');
  });

  it('reboots the existing session after launch without HMR flags', () => {
    expect(
      resolveAngularAppSessionAction(
        {
          __NS_UPDATE_ANGULAR_APP_OPTIONS__: () => undefined,
          __reboot_ng_modules__: () => undefined,
        },
        true,
      ),
    ).toBe('reboot-existing');
  });

  it('starts a first launch when the process has not launched', () => {
    expect(
      resolveAngularAppSessionAction(
        {
          __NS_UPDATE_ANGULAR_APP_OPTIONS__: () => undefined,
        },
        false,
      ),
    ).toBe('first-launch');
  });

  it('starts a first launch when no reboot hook exists yet', () => {
    expect(
      resolveAngularAppSessionAction(
        {
          __NS_UPDATE_ANGULAR_APP_OPTIONS__: () => undefined,
        },
        true,
      ),
    ).toBe('first-launch');
  });
});
