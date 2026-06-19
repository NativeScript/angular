import { createAngularRootTransitionGuard } from './root-transition-guard';

describe('Angular root transition guard', () => {
  afterEach(() => {
    jest.useRealTimers();
  });

  it('marks the root transition during resetRootView and clears it after the timeout', () => {
    jest.useFakeTimers();

    const globalObj: any = {};
    const createdRoot = { type: 'RootLayout' };
    const resetRootView = jest.fn((entry: { create: () => unknown }) => entry.create());
    const guard = createAngularRootTransitionGuard(globalObj);

    const result = guard.runApplicationResetRootView({ resetRootView }, () => createdRoot, 'RootLayout', 250);

    expect(result).toBe(createdRoot);
    expect(resetRootView).toHaveBeenCalledTimes(1);
    expect(globalObj.__NS_DEV_ROOT_TRANSITION_IN_PROGRESS__).toBe(true);
    expect(globalObj.__NS_DEV_ROOT_TRANSITION_REASON__).toBe('RootLayout');

    jest.advanceTimersByTime(249);
    expect(globalObj.__NS_DEV_ROOT_TRANSITION_IN_PROGRESS__).toBe(true);

    jest.advanceTimersByTime(1);
    expect(globalObj.__NS_DEV_ROOT_TRANSITION_IN_PROGRESS__).toBeUndefined();
    expect(globalObj.__NS_DEV_ROOT_TRANSITION_REASON__).toBeUndefined();
  });

  it('still clears the transition window when resetRootView throws', () => {
    jest.useFakeTimers();

    const globalObj: any = {};
    const guard = createAngularRootTransitionGuard(globalObj);

    expect(() =>
      guard.runApplicationResetRootView(
        {
          resetRootView: () => {
            throw new Error('boom');
          },
        },
        () => ({ type: 'RootLayout' }),
        'RootLayout',
        250,
      ),
    ).toThrow('boom');

    expect(globalObj.__NS_DEV_ROOT_TRANSITION_IN_PROGRESS__).toBe(true);
    expect(globalObj.__NS_DEV_ROOT_TRANSITION_REASON__).toBe('RootLayout');

    jest.runAllTimers();
    expect(globalObj.__NS_DEV_ROOT_TRANSITION_IN_PROGRESS__).toBeUndefined();
    expect(globalObj.__NS_DEV_ROOT_TRANSITION_REASON__).toBeUndefined();
  });
});