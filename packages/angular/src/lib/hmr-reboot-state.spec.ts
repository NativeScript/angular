import { HmrRebootEffects, HmrRebootState, HmrRun } from './hmr-reboot-state';

interface Ref {
  id: string;
}

const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

function setup() {
  const restored: Array<[string, string]> = [];
  const effects = {
    save: jest.fn((ref: Ref) => `state of ${ref.id}`),
    whenStable: jest.fn<Promise<boolean>, [Ref]>(async () => true),
    restore: jest.fn(async (ref: Ref, snapshots: string) => {
      restored.push([ref.id, snapshots]);
    }),
    log: jest.fn(),
  } satisfies HmrRebootEffects<Ref, string>;
  const state = new HmrRebootState<Ref, string>(effects);

  /** Models one evaluation of the app entry that reached runNativeScriptAngularApp. */
  function startApp(id: string) {
    const app = {
      ref: null as Ref | null,
      disposed: 0,
      run: null as HmrRun<Ref> | null,
      bootstrap() {
        app.ref = { id };
        app.run.bootstrapped(app.ref);
      },
      fail(error: unknown = new Error(`${id} failed`)) {
        app.run.failed(error);
      },
    };
    app.run = state.attach({
      ref: () => app.ref,
      dispose: () => {
        app.disposed++;
        app.ref = null;
      },
    });
    return app;
  }

  async function goodApp(id: string) {
    const app = startApp(id);
    app.bootstrap();
    await state.settled();
    return app;
  }

  return { state, effects, restored, startApp, goodApp };
}

describe('HmrRebootState', () => {
  it('does not treat the first launch as a reboot', async () => {
    const { state, startApp, effects } = setup();
    const app = startApp('app0');
    expect(app.run.rebooted).toBe(false);
    app.bootstrap();
    await expect(state.settled()).resolves.toBeUndefined();
    expect(effects.whenStable).not.toHaveBeenCalled();
  });

  it('is a no-op when no app is running', async () => {
    const { state, effects } = setup();
    state.prepare();
    expect(effects.save).not.toHaveBeenCalled();
    await expect(state.settled()).resolves.toBeUndefined();
  });

  it('D: restores a successful reboot, then saves fresh state from it on the next one', async () => {
    const { state, startApp, goodApp, effects, restored } = setup();
    const app0 = await goodApp('app0');
    state.prepare();
    expect(app0.disposed).toBe(1);
    const app1 = startApp('app1');
    expect(app1.run.rebooted).toBe(true);
    app1.bootstrap();
    await expect(state.settled()).resolves.toBeUndefined();
    expect(restored).toEqual([['app1', 'state of app0']]);

    state.prepare();
    expect(effects.save.mock.calls.map(([ref]) => ref.id)).toEqual(['app0', 'app1']);
    startApp('app2').bootstrap();
    await state.settled();
    expect(restored).toEqual([
      ['app1', 'state of app0'],
      ['app2', 'state of app1'],
    ]);
  });

  it('restores without anyone awaiting the settled promise', async () => {
    const { state, startApp, goodApp, restored } = setup();
    await goodApp('app0');
    state.prepare();
    startApp('app1').bootstrap();
    await flush();
    expect(restored).toEqual([['app1', 'state of app0']]);
  });

  it('A: an entry that fails to import before bootstrapping, then one that works', async () => {
    const { state, startApp, goodApp, effects, restored } = setup();
    const app0 = await goodApp('app0');
    state.prepare();
    // The failed entry never registered a dispose, so the torn-down app's runs again.
    state.prepare();
    expect(app0.disposed).toBe(1);
    const app2 = startApp('app2');
    expect(app2.run.rebooted).toBe(true);
    app2.bootstrap();
    await state.settled();
    expect(effects.save).toHaveBeenCalledTimes(1);
    expect(restored).toEqual([['app2', 'state of app0']]);
  });

  it('A: an entry whose bootstrap throws synchronously, then one that works', async () => {
    const { state, startApp, goodApp, effects, restored } = setup();
    await goodApp('app0');
    state.prepare();
    const app1 = startApp('app1');
    const error = new Error('sync');
    app1.fail(error);
    await expect(state.settled()).resolves.toEqual({ error });
    state.prepare();
    expect(app1.disposed).toBe(1);
    startApp('app2').bootstrap();
    await expect(state.settled()).resolves.toBeUndefined();
    expect(effects.save).toHaveBeenCalledTimes(1);
    expect(restored).toEqual([['app2', 'state of app0']]);
  });

  it('B: several failed reboots in a row still restore the original state', async () => {
    const { state, startApp, goodApp, effects, restored } = setup();
    await goodApp('app0');
    state.prepare();
    // import fails
    state.prepare();
    startApp('app2').fail();
    state.prepare();
    // import fails
    state.prepare();
    startApp('app4').bootstrap();
    await state.settled();
    expect(effects.save).toHaveBeenCalledTimes(1);
    expect(restored).toEqual([['app4', 'state of app0']]);
  });

  it('C: an asynchronously rejected bootstrap is reported and never saved from', async () => {
    const { state, startApp, goodApp, effects, restored } = setup();
    await goodApp('app0');
    state.prepare();
    const app1 = startApp('app1');
    const settled = state.settled();
    // Half bootstrapped: something holds a ref although the bootstrap rejected.
    app1.ref = { id: 'app1' };
    const error = new Error('async');
    app1.fail(error);
    await expect(settled).resolves.toEqual({ error });
    await expect(state.settled()).resolves.toEqual({ error });

    state.prepare();
    startApp('app2').bootstrap();
    await state.settled();
    expect(effects.save).toHaveBeenCalledTimes(1);
    expect(restored).toEqual([['app2', 'state of app0']]);
  });

  it('E: a second prepare without an import keeps the saved state', async () => {
    const { state, startApp, goodApp, effects, restored } = setup();
    const app0 = await goodApp('app0');
    state.prepare();
    state.prepare();
    expect(effects.save).toHaveBeenCalledTimes(1);
    expect(app0.disposed).toBe(1);
    startApp('app1').bootstrap();
    await state.settled();
    expect(restored).toEqual([['app1', 'state of app0']]);
  });

  it('does not consume the reboot when asked to settle before the entry bootstraps', async () => {
    const { state, startApp, goodApp, effects, restored } = setup();
    await goodApp('app0');
    state.prepare();
    await expect(state.settled()).resolves.toBeUndefined();
    expect(effects.log).toHaveBeenCalledTimes(1);
    const app1 = startApp('app1');
    expect(app1.run.rebooted).toBe(true);
    app1.bootstrap();
    await state.settled();
    expect(restored).toEqual([['app1', 'state of app0']]);
  });

  it('ignores a bootstrap that resolves after its app was torn down', async () => {
    const { state, startApp, goodApp, effects, restored } = setup();
    await goodApp('app0');
    state.prepare();
    const app1 = startApp('app1');
    const settled = state.settled();
    state.prepare();
    await expect(settled).resolves.toBeUndefined();
    app1.run.bootstrapped({ id: 'app1' });
    app1.run.failed(new Error('late'));
    startApp('app2').bootstrap();
    await state.settled();
    expect(effects.save).toHaveBeenCalledTimes(1);
    expect(restored).toEqual([['app2', 'state of app0']]);
  });

  it('keeps the state when the next reboot starts before the restore', async () => {
    let release: () => void;
    const { state, startApp, goodApp, effects, restored } = setup();
    await goodApp('app0');
    effects.whenStable.mockImplementationOnce(() => new Promise<boolean>((resolve) => (release = () => resolve(true))));
    state.prepare();
    startApp('app1').bootstrap();
    await flush();
    state.prepare();
    release();
    await flush();
    expect(restored).toEqual([]);
    expect(effects.save).toHaveBeenCalledTimes(1);

    startApp('app2').bootstrap();
    await state.settled();
    expect(restored).toEqual([['app2', 'state of app0']]);
  });

  it('keeps the state when the restore fails', async () => {
    const { state, startApp, goodApp, effects } = setup();
    await goodApp('app0');
    state.prepare();
    effects.restore.mockRejectedValueOnce(new Error('restore'));
    startApp('app1').bootstrap();
    await expect(state.settled()).resolves.toBeUndefined();
    expect(effects.log).toHaveBeenCalledTimes(1);

    state.prepare();
    startApp('app2').bootstrap();
    await state.settled();
    expect(effects.save).toHaveBeenCalledTimes(1);
    expect(effects.restore).toHaveBeenLastCalledWith({ id: 'app2' }, 'state of app0');
  });

  it('skips the restore when the app is destroyed while waiting to be stable', async () => {
    const { state, startApp, goodApp, effects } = setup();
    await goodApp('app0');
    state.prepare();
    effects.whenStable.mockResolvedValueOnce(false);
    startApp('app1').bootstrap();
    await state.settled();
    expect(effects.restore).not.toHaveBeenCalled();
  });

  describe('prepare on a retry', () => {
    it('is a no-op the second time after a failed bootstrap', async () => {
      const { state, startApp, goodApp, effects, restored } = setup();
      await goodApp('app0');
      state.prepare();
      const app1 = startApp('app1');
      app1.fail();
      expect(() => state.prepare()).not.toThrow();
      expect(() => state.prepare()).not.toThrow();
      expect(app1.disposed).toBe(1);
      expect(effects.save).toHaveBeenCalledTimes(1);

      startApp('app2').bootstrap();
      await state.settled();
      expect(restored).toEqual([['app2', 'state of app0']]);
    });

    it('is a no-op when no app has ever bootstrapped', async () => {
      const { state, startApp, effects } = setup();
      const app0 = startApp('app0');
      app0.fail();
      expect(() => state.prepare()).not.toThrow();
      expect(() => state.prepare()).not.toThrow();
      expect(app0.disposed).toBe(1);
      expect(effects.save).not.toHaveBeenCalled();

      const app1 = startApp('app1');
      expect(app1.run.rebooted).toBe(true);
      app1.bootstrap();
      await expect(state.settled()).resolves.toBeUndefined();
      expect(effects.restore).not.toHaveBeenCalled();
    });

    it('does not settle with the error of a failed attempt that was torn down', async () => {
      const { state, startApp, goodApp } = setup();
      await goodApp('app0');
      state.prepare();
      const error = new Error('bootstrap');
      startApp('app1').fail(error);
      await expect(state.settled()).resolves.toEqual({ error });
      state.prepare();
      await expect(state.settled()).resolves.toBeUndefined();
      startApp('app2').bootstrap();
      await expect(state.settled()).resolves.toBeUndefined();
    });

    it('rethrows a failed dispose once, then keeps the saved state for the next app', async () => {
      const { state, startApp, goodApp, effects, restored } = setup();
      await goodApp('app0');
      state.prepare();
      state.attach({
        ref: () => ({ id: 'app1' }),
        dispose: () => {
          throw new Error('dispose');
        },
      });
      expect(() => state.prepare()).toThrow('dispose');
      expect(() => state.prepare()).not.toThrow();

      const app2 = startApp('app2');
      expect(app2.run.rebooted).toBe(true);
      app2.bootstrap();
      await state.settled();
      expect(effects.save).toHaveBeenCalledTimes(1);
      expect(restored).toEqual([['app2', 'state of app0']]);
    });
  });

  it('still disposes the app when saving throws', async () => {
    const { state, goodApp, effects } = setup();
    effects.save.mockImplementationOnce(() => {
      throw new Error('save');
    });
    const app0 = await goodApp('app0');
    state.prepare();
    expect(app0.disposed).toBe(1);
    expect(effects.log).toHaveBeenCalledTimes(1);
  });
});
