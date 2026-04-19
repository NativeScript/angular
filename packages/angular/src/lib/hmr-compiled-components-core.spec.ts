import {
  getAngularCoreForHmrReset,
  rememberAngularCoreForHmr,
  resetAngularHmrCompiledComponents,
} from './hmr-compiled-components-core';

describe('Angular HMR compiled component reset', () => {
  it('calls Angular internal compiled-component reset when available', () => {
    const core = {
      ɵresetCompiledComponents: jest.fn(),
    };

    expect(resetAngularHmrCompiledComponents(core)).toBe(true);
    expect(core.ɵresetCompiledComponents).toHaveBeenCalledTimes(1);
  });

  it('returns false when Angular core does not expose the reset hook', () => {
    expect(resetAngularHmrCompiledComponents({})).toBe(false);
  });

  it('swallows reset failures so HMR disposal can continue', () => {
    const core = {
      ɵresetCompiledComponents: jest.fn(() => {
        throw new Error('boom');
      }),
    };

    expect(resetAngularHmrCompiledComponents(core)).toBe(false);
    expect(core.ɵresetCompiledComponents).toHaveBeenCalledTimes(1);
  });

  it('prefers the preserved global Angular core object for resets', () => {
    const originalCore = {
      ɵresetCompiledComponents: jest.fn(),
    };
    const replacementCore = {
      ɵresetCompiledComponents: jest.fn(),
    };
    const globalObj: any = {
      __NS_ANGULAR_CORE__: originalCore,
    };

    expect(getAngularCoreForHmrReset(replacementCore, globalObj)).toBe(originalCore);
  });

  it('remembers the first Angular core object and does not replace it later', () => {
    const originalCore = {
      ɵresetCompiledComponents: jest.fn(),
    };
    const replacementCore = {
      ɵresetCompiledComponents: jest.fn(),
    };
    const globalObj: any = {};

    expect(rememberAngularCoreForHmr(originalCore, globalObj)).toBe(originalCore);
    expect(globalObj.__NS_ANGULAR_CORE__).toBe(originalCore);
    expect(rememberAngularCoreForHmr(replacementCore, globalObj)).toBe(originalCore);
    expect(globalObj.__NS_ANGULAR_CORE__).toBe(originalCore);
  });
});