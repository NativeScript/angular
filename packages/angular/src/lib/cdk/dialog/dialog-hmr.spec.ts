import { Subject } from 'rxjs';
import {
  abortCapturedDialog,
  captureDialogsForHmr,
  clearPendingHmrDialogs,
  consumePendingHmrDialogs,
  HmrCandidateDialog,
  peekPendingHmrDialogs,
  selectPreservableDialogs,
} from './dialog-hmr';
import { NativeDialogConfig } from './dialog-config';
import { NativeDialogRef } from './dialog-ref';

class StubComponent {}
class OtherStubComponent {}

function makeRef(afterClosed: Subject<unknown>): NativeDialogRef<unknown> {
  return { _afterClosed: afterClosed } as unknown as NativeDialogRef<unknown>;
}

function makeCandidate(opts: { component?: typeof StubComponent | typeof OtherStubComponent; preserveOnHmr?: boolean; subject?: Subject<unknown> } = {}): HmrCandidateDialog {
  const config = new NativeDialogConfig();
  config.preserveOnHmr = opts.preserveOnHmr;
  const subject = opts.subject ?? new Subject<unknown>();
  return {
    ref: makeRef(subject),
    componentClass: opts.component as any,
    config,
  };
}

describe('dialog-hmr', () => {
  afterEach(() => {
    clearPendingHmrDialogs();
  });

  describe('selectPreservableDialogs', () => {
    it('keeps only dialogs marked preserveOnHmr that have a real component class', () => {
      const a = makeCandidate({ component: StubComponent, preserveOnHmr: true });
      const b = makeCandidate({ component: StubComponent, preserveOnHmr: false });
      const c = makeCandidate({ component: undefined, preserveOnHmr: true });

      expect(selectPreservableDialogs([a, b, c])).toEqual([a]);
    });
  });

  describe('captureDialogsForHmr', () => {
    it('stashes preservable dialogs onto globalThis so the next bootstrap can pick them up', () => {
      const subject = new Subject<unknown>();
      const candidate = makeCandidate({ component: StubComponent, preserveOnHmr: true, subject });

      const captured = captureDialogsForHmr([candidate]);

      expect(captured).toHaveLength(1);
      expect(captured[0].componentClass).toBe(StubComponent);
      expect(peekPendingHmrDialogs()).toHaveLength(1);
    });

    it('captures the source class name so post-reboot restore can look up the fresh class by name', () => {
      const candidate = makeCandidate({ component: StubComponent, preserveOnHmr: true });

      const captured = captureDialogsForHmr([candidate]);

      expect(captured).toHaveLength(1);
      expect(captured[0].componentName).toBe('StubComponent');
    });

    it('uses the most-recently-defined class name even when the captured class is renamed in source', () => {
      const candidateA = makeCandidate({ component: StubComponent, preserveOnHmr: true });
      const candidateB = makeCandidate({ component: OtherStubComponent, preserveOnHmr: true });

      const captured = captureDialogsForHmr([candidateA, candidateB]);

      expect(captured.map((c) => c.componentName)).toEqual(['StubComponent', 'OtherStubComponent']);
    });

    it('clears any prior stash when nothing is preservable so a stale capture cannot leak forward', () => {
      const stale = makeCandidate({ component: StubComponent, preserveOnHmr: true });
      captureDialogsForHmr([stale]);
      expect(peekPendingHmrDialogs()).toHaveLength(1);

      const preservedNothing = captureDialogsForHmr([
        makeCandidate({ component: StubComponent, preserveOnHmr: false }),
      ]);

      expect(preservedNothing).toEqual([]);
      expect(peekPendingHmrDialogs()).toEqual([]);
    });

    it('grafts the captured afterClosed subject so the original consumer resolves on restoration', () => {
      const subject = new Subject<unknown>();
      const observed: unknown[] = [];
      const completed: boolean[] = [];
      subject.subscribe({
        next: (value) => observed.push(value),
        complete: () => completed.push(true),
      });

      const captured = captureDialogsForHmr([makeCandidate({ component: StubComponent, preserveOnHmr: true, subject })]);
      captured[0].graftAfterClosed('closed-value');

      expect(observed).toEqual(['closed-value']);
      expect(completed).toEqual([true]);
    });

    it('graft is a no-op when the captured subject already completed', () => {
      const subject = new Subject<unknown>();
      subject.complete();

      const captured = captureDialogsForHmr([makeCandidate({ component: StubComponent, preserveOnHmr: true, subject })]);

      expect(() => captured[0].graftAfterClosed('ignored')).not.toThrow();
    });
  });

  describe('consumePendingHmrDialogs', () => {
    it('drains the stash so consecutive consumers do not see duplicates', () => {
      captureDialogsForHmr([
        makeCandidate({ component: StubComponent, preserveOnHmr: true }),
        makeCandidate({ component: OtherStubComponent, preserveOnHmr: true }),
      ]);

      expect(consumePendingHmrDialogs()).toHaveLength(2);
      expect(consumePendingHmrDialogs()).toHaveLength(0);
    });

    it('returns an empty list when nothing has been stashed', () => {
      expect(consumePendingHmrDialogs()).toEqual([]);
    });
  });

  describe('abortCapturedDialog', () => {
    it('completes the original subject so awaiting consumers do not dangle', () => {
      const subject = new Subject<unknown>();
      const completed: boolean[] = [];
      subject.subscribe({ complete: () => completed.push(true) });

      const captured = captureDialogsForHmr([makeCandidate({ component: StubComponent, preserveOnHmr: true, subject })]);
      abortCapturedDialog(captured[0]);

      expect(completed).toEqual([true]);
    });
  });
});
