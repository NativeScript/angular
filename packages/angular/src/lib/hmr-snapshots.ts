// Runtime-import free so it can be unit tested without Angular or NativeScript.
import type { NativeScriptHmrParticipant } from './tokens';

export interface HmrSnapshot {
  version: number | undefined;
  state: unknown;
}

export type HmrLog = (message: string, error?: unknown) => void;

export function saveHmrSnapshots(
  participants: readonly NativeScriptHmrParticipant[],
  log: HmrLog,
): Map<string, HmrSnapshot> {
  const snapshots = new Map<string, HmrSnapshot>();
  for (const participant of participants) {
    try {
      snapshots.set(participant.key, { version: participant.version, state: participant.save() });
    } catch (error) {
      log(`HMR participant "${participant.key}" failed to save its state; skipping it.`, error);
    }
  }
  return snapshots;
}

export async function restoreHmrSnapshots(
  participants: readonly NativeScriptHmrParticipant[],
  snapshots: ReadonlyMap<string, HmrSnapshot>,
  run: <R>(fn: () => R) => R,
  log: HmrLog,
): Promise<void> {
  for (const participant of participants) {
    const snapshot = snapshots.get(participant.key);
    if (!snapshot) {
      continue;
    }
    if (snapshot.version !== participant.version) {
      log(
        `HMR participant "${participant.key}" snapshot version ${snapshot.version} does not match ${participant.version}; skipping restore.`,
      );
      continue;
    }
    try {
      await run(() => participant.restore(snapshot.state));
    } catch (error) {
      log(`HMR participant "${participant.key}" failed to restore its state; skipping it.`, error);
    }
  }
}
