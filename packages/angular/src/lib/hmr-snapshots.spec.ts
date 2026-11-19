import { restoreHmrSnapshots, saveHmrSnapshots } from './hmr-snapshots';
import type { NativeScriptHmrParticipant } from './tokens';

function participant(
  key: string,
  overrides: Partial<NativeScriptHmrParticipant> = {},
): NativeScriptHmrParticipant & { restored: unknown[] } {
  const restored: unknown[] = [];
  return {
    key,
    save: () => `${key}-state`,
    restore: (state) => {
      restored.push(state);
    },
    restored,
    ...overrides,
  };
}

const passthrough = <R>(fn: () => R) => fn();

describe('HMR snapshots', () => {
  it('saves each participant by key, skipping one whose save throws', () => {
    const log = jest.fn();
    const snapshots = saveHmrSnapshots(
      [
        participant('a', { version: 2 }),
        participant('b', {
          save: () => {
            throw new Error('boom');
          },
        }),
      ],
      log,
    );
    expect([...snapshots.entries()]).toEqual([['a', { version: 2, state: 'a-state' }]]);
    expect(log).toHaveBeenCalledTimes(1);
  });

  it('restores only participants whose key and version match a snapshot', async () => {
    const log = jest.fn();
    const same = participant('same', { version: 1 });
    const bumped = participant('bumped', { version: 2 });
    const unknown = participant('unknown');
    const snapshots = saveHmrSnapshots(
      [participant('same', { version: 1 }), participant('bumped', { version: 1 })],
      log,
    );
    await restoreHmrSnapshots([same, bumped, unknown], snapshots, passthrough, log);
    expect(same.restored).toEqual(['same-state']);
    expect(bumped.restored).toEqual([]);
    expect(unknown.restored).toEqual([]);
    expect(log).toHaveBeenCalledTimes(1);
  });

  it('logs a failing restore and still restores the rest', async () => {
    const log = jest.fn();
    const failing = participant('failing', {
      restore: () => Promise.reject(new Error('boom')),
    });
    const ok = participant('ok');
    const snapshots = saveHmrSnapshots([participant('failing'), participant('ok')], log);
    await restoreHmrSnapshots([failing, ok], snapshots, passthrough, log);
    expect(ok.restored).toEqual(['ok-state']);
    expect(log).toHaveBeenCalledTimes(1);
  });

  it('runs each restore through the given runner', async () => {
    const run = jest.fn(passthrough);
    const snapshots = saveHmrSnapshots([participant('a')], jest.fn());
    await restoreHmrSnapshots([participant('a')], snapshots, run, jest.fn());
    expect(run).toHaveBeenCalledTimes(1);
  });
});
