import { resetAngularHmrCompiledComponents } from './hmr-compiled-components-core';

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
});