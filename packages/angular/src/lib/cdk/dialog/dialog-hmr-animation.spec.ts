import { NativeDialogConfig } from './dialog-config';
import { buildNonAnimatedRestoreConfig, suppressNativeCloseAnimation } from './dialog-hmr-animation';
import { HmrCandidateDialog } from './dialog-hmr';

class StubComponent {}

function makeCandidate(opts: {
  parentView?: { _modalAnimatedOptions?: boolean[] };
  preserveOnHmr?: boolean;
}): HmrCandidateDialog {
  const config = new NativeDialogConfig();
  config.preserveOnHmr = opts.preserveOnHmr ?? true;
  const ref: unknown = {
    _nativeModalRef: opts.parentView ? { parentView: opts.parentView } : undefined,
  };
  return {
    ref: ref as HmrCandidateDialog['ref'],
    componentClass: StubComponent as unknown as HmrCandidateDialog['componentClass'],
    config,
  };
}

describe('NativeDialog HMR animation helpers', () => {
  describe('suppressNativeCloseAnimation', () => {
    it('flips the top of the parent view animated stack to false so the next dismiss is un-animated', () => {
      const stack: boolean[] = [true];
      const candidate = makeCandidate({ parentView: { _modalAnimatedOptions: stack } });

      suppressNativeCloseAnimation(candidate);

      expect(stack).toEqual([false]);
    });

    it('only mutates the top entry so deeper presentations stay untouched', () => {
      const stack: boolean[] = [true, true];
      const candidate = makeCandidate({ parentView: { _modalAnimatedOptions: stack } });

      suppressNativeCloseAnimation(candidate);

      // The dismiss reads `slice(-1)[0]`; deeper entries belong to other
      // open modals on the same parent view and must stay animated.
      expect(stack).toEqual([true, false]);
    });

    it('skips the mutation when the candidate did not opt into preservation', () => {
      const stack: boolean[] = [true];
      const candidate = makeCandidate({
        parentView: { _modalAnimatedOptions: stack },
        preserveOnHmr: false,
      });

      suppressNativeCloseAnimation(candidate);

      expect(stack).toEqual([true]);
    });

    it('is a no-op when the underlying native modal ref is missing', () => {
      const candidate = makeCandidate({ parentView: undefined });

      expect(() => suppressNativeCloseAnimation(candidate)).not.toThrow();
    });

    it('is a no-op when the parent view exposes no animated stack', () => {
      const candidate = makeCandidate({ parentView: {} });

      expect(() => suppressNativeCloseAnimation(candidate)).not.toThrow();
    });

    it('is a no-op when the animated stack is present but empty', () => {
      const candidate = makeCandidate({ parentView: { _modalAnimatedOptions: [] } });

      expect(() => suppressNativeCloseAnimation(candidate)).not.toThrow();
    });
  });

  describe('buildNonAnimatedRestoreConfig', () => {
    it('returns a NativeDialogConfig with nativeOptions.animated forced to false', () => {
      const original = new NativeDialogConfig();
      original.nativeOptions = { animated: true, fullscreen: true } as never;

      const restore = buildNonAnimatedRestoreConfig(original);

      expect((restore.nativeOptions as Record<string, unknown>)?.animated).toBe(false);
      expect((restore.nativeOptions as Record<string, unknown>)?.fullscreen).toBe(true);
    });

    it('does not mutate the original config so cached references stay intact', () => {
      const original = new NativeDialogConfig();
      original.nativeOptions = { animated: true } as never;

      const restore = buildNonAnimatedRestoreConfig(original);

      expect(restore).not.toBe(original);
      expect((original.nativeOptions as Record<string, unknown>)?.animated).toBe(true);
    });

    it('synthesises a nativeOptions object when the original config has none', () => {
      const original = new NativeDialogConfig();
      // Default config initialiser sets nativeOptions to {}, replicate
      // the shape projects produce when they explicitly set it to
      // undefined for some opens.
      original.nativeOptions = undefined;

      const restore = buildNonAnimatedRestoreConfig(original);

      expect(restore.nativeOptions).toEqual({ animated: false });
      expect(original.nativeOptions).toBeUndefined();
    });

    it('preserves the rest of the captured config (data, id, preserveOnHmr) so the reopened modal looks identical to the user', () => {
      const original = new NativeDialogConfig();
      original.id = 'resource-modal';
      original.data = { resourceId: 42 };
      original.preserveOnHmr = true;

      const restore = buildNonAnimatedRestoreConfig(original);

      expect(restore.id).toBe('resource-modal');
      expect(restore.data).toEqual({ resourceId: 42 });
      expect(restore.preserveOnHmr).toBe(true);
    });
  });
});
