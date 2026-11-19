// Runtime-import free so it can be unit tested without Angular or NativeScript.
import type { HmrLog } from './hmr-snapshots';

/** Resolved value of a settled reboot: `{ error }` when the rebooted app failed to bootstrap. */
export type HmrRebootResult = void | { error: unknown };

export interface HmrRebootEffects<Ref, Snapshots> {
  save(ref: Ref): Snapshots;
  /** Resolves to false when the app was destroyed while waiting. */
  whenStable(ref: Ref): Promise<boolean>;
  restore(ref: Ref, snapshots: Snapshots): Promise<void>;
  log: HmrLog;
}

export interface HmrRunHooks<Ref> {
  /** The run's bootstrapped app, or null when it has none (not bootstrapped, failed or destroyed). */
  ref(): Ref | null;
  dispose(): void;
}

export interface HmrRun<Ref> {
  /** Whether this run boots the app again after a {@link HmrRebootState.prepare}. */
  readonly rebooted: boolean;
  /** Only the first report of a run counts. */
  bootstrapped(ref: Ref): void;
  failed(error: unknown): void;
}

type Outcome<Ref> = { ref: Ref } | { error: unknown } | null;

interface RunRecord<Ref> extends HmrRun<Ref> {
  hooks: HmrRunHooks<Ref>;
  report(outcome: Outcome<Ref>): void;
  settled?: Promise<HmrRebootResult>;
}

/**
 * Soft reboot bookkeeping across app runs. Snapshots belong to the last app
 * that booted and was restored: a failed or unrestored run never replaces
 * them, so any number of failed reboots still restore the last good state.
 */
export class HmrRebootState<Ref, Snapshots> {
  private current: RunRecord<Ref> | null = null;
  private held: { snapshots: Snapshots } | null = null;
  private prepared = false;

  constructor(private readonly effects: HmrRebootEffects<Ref, Snapshots>) {}

  attach(hooks: HmrRunHooks<Ref>): HmrRun<Ref> {
    const rebooted = this.prepared || this.held !== null;
    this.prepared = false;
    let resolveOutcome: (outcome: Outcome<Ref>) => void;
    const outcome = new Promise<Outcome<Ref>>((resolve) => (resolveOutcome = resolve));
    let reported = false;
    const run: RunRecord<Ref> = {
      rebooted,
      hooks,
      report: (value) => {
        if (!reported) {
          reported = true;
          resolveOutcome(value);
        }
      },
      bootstrapped: (ref) => run.report({ ref }),
      failed: (error) => run.report({ error }),
    };
    if (rebooted) {
      // Started eagerly so the restore runs even if nobody awaits it.
      run.settled = this.settle(run, outcome);
    }
    this.current = run;
    return run;
  }

  /** Saves the running app's state (unless older unrestored snapshots are held) and disposes it. */
  prepare(): void {
    const run = this.current;
    if (!run) {
      return;
    }
    this.current = null;
    this.prepared = true;
    run.report(null);
    try {
      const ref = this.held ? null : run.hooks.ref();
      if (ref !== null) {
        this.held = { snapshots: this.effects.save(ref) };
      }
    } catch (error) {
      this.effects.log('Could not save HMR state before a reboot.', error);
    } finally {
      run.hooks.dispose();
    }
  }

  settled(): Promise<HmrRebootResult> {
    if (this.prepared) {
      // An entry may bootstrap after it finished importing; the run it attaches must still restore.
      this.effects.log('The app entry did not bootstrap Angular after an HMR reboot; HMR state is not restored yet.');
      return Promise.resolve();
    }
    return this.current?.settled ?? Promise.resolve();
  }

  private async settle(run: RunRecord<Ref>, outcome: Promise<Outcome<Ref>>): Promise<HmrRebootResult> {
    const result = await outcome;
    if (result === null) {
      return;
    }
    if ('error' in result) {
      this.effects.log('The app failed to bootstrap after an HMR reboot.', result.error);
      return { error: result.error };
    }
    try {
      const alive = await this.effects.whenStable(result.ref);
      const held = this.held;
      if (!alive || this.current !== run || !held) {
        return;
      }
      await this.effects.restore(result.ref, held.snapshots);
      if (this.current === run && this.held === held) {
        this.held = null;
      }
    } catch (error) {
      this.effects.log('Could not restore HMR state after a reboot.', error);
    }
  }
}
