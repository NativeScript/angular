import { AddViewHost, installPvcModalHostPropPropagation, ModalHostView, propagateModalHostPropsToDescendants, PVC_ADD_VIEW_WRAPPED_MARKER } from './modal-host-props';

/**
 * Minimal stand-in for a NativeScript `View` shape that supports
 * the `eachChildView` walk these helpers rely on. Real `View`
 * instances satisfy `ModalHostView` trivially; using a plain JS
 * stub here keeps the spec free of `@nativescript/core` (which
 * cannot load in the Jest Node runner without a runtime stub).
 */
class FakeView implements ModalHostView, AddViewHost {
  _dialogFragment?: unknown;
  viewController?: unknown;
  children: FakeView[] = [];

  constructor(public name: string = 'view') {}

  eachChildView(callback: (child: ModalHostView) => boolean): void {
    for (const child of this.children) {
      if (callback(child) === false) {
        return;
      }
    }
  }

  // ProxyViewContainer-shaped add: links child into `children` and is
  // the call site we wrap in `installPvcModalHostPropPropagation`.
  _addView(view: ModalHostView, _atIndex?: number): void {
    this.children.push(view as FakeView);
  }
}

function buildSubtree(...names: string[]): FakeView[] {
  return names.map((n) => new FakeView(n));
}

describe('modal-host-props', () => {
  describe('propagateModalHostPropsToDescendants', () => {
    it('mirrors `_dialogFragment` and `viewController` from the wrapper onto every native-like descendant', () => {
      // Wrapper holds the canonical references NS core stamped on
      // it during `_showNativeModalView`. The PVC, the template
      // root, and any nested child must end up with the same
      // references so user template code (`onLoaded($event)` →
      // `args.object._dialogFragment.getDialog()`) reads the real
      // host objects instead of `undefined`.
      const dialogFragment = { kind: 'DialogFragment' };
      const viewController = { kind: 'UIViewController' };
      const wrapper = new FakeView('wrapper');
      wrapper._dialogFragment = dialogFragment;
      wrapper.viewController = viewController;

      const pvc = new FakeView('pvc');
      const stackLayout = new FakeView('stack');
      const label = new FakeView('label');
      wrapper.children = [pvc];
      pvc.children = [stackLayout];
      stackLayout.children = [label];

      propagateModalHostPropsToDescendants(wrapper, wrapper);

      expect(pvc._dialogFragment).toBe(dialogFragment);
      expect(pvc.viewController).toBe(viewController);
      expect(stackLayout._dialogFragment).toBe(dialogFragment);
      expect(stackLayout.viewController).toBe(viewController);
      expect(label._dialogFragment).toBe(dialogFragment);
      expect(label.viewController).toBe(viewController);
    });

    it('never overwrites the wrapper itself even when the walk starts at the wrapper', () => {
      // NS core owns the wrapper's host-prop assignment; mirroring
      // would only let our copy drift out of sync (e.g. across an
      // HMR re-render where NS reassigns on the wrapper but our
      // mirror lags behind).
      const dialogFragment = { kind: 'DialogFragment' };
      const wrapper = new FakeView('wrapper');
      wrapper._dialogFragment = dialogFragment;
      const sentinel = wrapper._dialogFragment;

      propagateModalHostPropsToDescendants(wrapper, wrapper);

      // Identity preserved: we did not even touch the slot.
      expect(wrapper._dialogFragment).toBe(sentinel);
    });

    it('no-ops when the modal has not been shown yet (wrapper has neither host prop)', () => {
      // Before `showModal` returns, NS core has not stamped the
      // host props. The helper must not write `undefined` onto the
      // descendants — that would shadow a real value if mirroring
      // ever races a later call.
      const wrapper = new FakeView('wrapper');
      const stack = new FakeView('stack');
      wrapper.children = [stack];
      stack._dialogFragment = { kind: 'preexisting' };

      propagateModalHostPropsToDescendants(wrapper, wrapper);

      expect(stack._dialogFragment).toEqual({ kind: 'preexisting' });
    });

    it('no-ops when the modal has already closed (NS sets both props to null on the wrapper)', () => {
      // NS clears `_dialogFragment` / `viewController` to `null`
      // on close. Mirroring after that would persist stale
      // references on descendants past their useful lifetime —
      // worse, it would *clear* user-set values in the same slot.
      const wrapper = new FakeView('wrapper');
      wrapper._dialogFragment = null;
      wrapper.viewController = null;
      const stack = new FakeView('stack');
      const userStash = { kind: 'user-stashed' };
      stack._dialogFragment = userStash;
      wrapper.children = [stack];

      propagateModalHostPropsToDescendants(wrapper, wrapper);

      expect(stack._dialogFragment).toBe(userStash);
    });

    it('skips redundant writes when the descendant already holds the same reference (idempotency)', () => {
      // Repeat calls are expected during HMR: the initial-open
      // propagate runs, then the PVC `_addView` wrap re-runs the
      // walk for each child added during a re-render. Re-assigning
      // the same identity is harmless but Object.defineProperty
      // tricks (some host views have setter side effects on
      // assignment) would fire spurious updates.
      const dialogFragment = { kind: 'DialogFragment' };
      const wrapper = new FakeView('wrapper');
      wrapper._dialogFragment = dialogFragment;
      const stack = new FakeView('stack');
      stack._dialogFragment = dialogFragment;
      wrapper.children = [stack];
      let setterCalls = 0;
      Object.defineProperty(stack, '_dialogFragment', {
        get: () => dialogFragment,
        set: () => {
          setterCalls++;
        },
      });

      propagateModalHostPropsToDescendants(wrapper, wrapper);

      expect(setterCalls).toBe(0);
    });

    it('walks `root` directly when called with a non-wrapper root (the HMR `_addView` pre-hook entry point)', () => {
      // The PVC `_addView` wrap calls this with `root === viewBeingAdded`.
      // We must propagate onto the just-added subtree even though
      // it is not yet a child of the wrapper.
      const dialogFragment = { kind: 'DialogFragment' };
      const wrapper = new FakeView('wrapper');
      wrapper._dialogFragment = dialogFragment;
      const newTemplateRoot = new FakeView('new-template-root');
      const nested = new FakeView('nested');
      newTemplateRoot.children = [nested];

      propagateModalHostPropsToDescendants(wrapper, newTemplateRoot);

      expect(newTemplateRoot._dialogFragment).toBe(dialogFragment);
      expect(nested._dialogFragment).toBe(dialogFragment);
    });

    it('is safe with nullish inputs', () => {
      // Defensive: helpers are called from real Angular tear-down
      // paths where either input can briefly be `undefined`.
      expect(() => propagateModalHostPropsToDescendants(undefined, undefined)).not.toThrow();
      expect(() => propagateModalHostPropsToDescendants(undefined, new FakeView())).not.toThrow();
      expect(() => propagateModalHostPropsToDescendants(new FakeView(), undefined)).not.toThrow();
    });
  });

  describe('installPvcModalHostPropPropagation', () => {
    it('mirrors host-props onto each child added after install (HMR `ɵɵreplaceMetadata` rerender simulation)', () => {
      // Setup: wrapper already has host props (modal is open).
      // We install on the host PVC, then simulate Angular's HMR
      // re-render path: add a fresh template root via the wrapped
      // `_addView`. The new child *must* have `_dialogFragment`
      // set *before* the underlying `_addView` runs, because NS's
      // real `_addView` synchronously fires the `loaded` event
      // chain on the new view — that's exactly where the user's
      // `onLoaded` handler crashed.
      const dialogFragment = { kind: 'DialogFragment' };
      const wrapper = new FakeView('wrapper');
      wrapper._dialogFragment = dialogFragment;

      // Install the "original" `_addView` spy FIRST so our wrap
      // captures it via `bind()` and calls it as the inner.
      // Reversing the order would let the test's spy clobber the
      // wrap and assert nothing meaningful.
      const pvc = new FakeView('pvc');
      let dialogFragmentAtAddTime: unknown = 'not-set';
      const baseAdd = pvc._addView!.bind(pvc);
      pvc._addView = (view: ModalHostView, atIndex?: number) => {
        dialogFragmentAtAddTime = (view as FakeView)._dialogFragment;
        baseAdd(view, atIndex);
      };

      installPvcModalHostPropPropagation(pvc, wrapper);

      const newTemplateRoot = new FakeView('new-template-root');
      pvc._addView!(newTemplateRoot);

      expect(dialogFragmentAtAddTime).toBe(dialogFragment);
      expect(newTemplateRoot._dialogFragment).toBe(dialogFragment);
    });

    it('marks the host with `PVC_ADD_VIEW_WRAPPED_MARKER` and is idempotent on repeat install', () => {
      // Re-wrapping would create an O(n) chain of wrappers and
      // make the failure mode at close ("slow no-op") progressively
      // slower. The marker is the only signal we have to avoid this
      // since the host instance has no public install-state API.
      const wrapper = new FakeView('wrapper');
      wrapper._dialogFragment = { kind: 'DialogFragment' };
      const pvc = new FakeView('pvc');
      const original = pvc._addView;

      installPvcModalHostPropPropagation(pvc, wrapper);
      const onceWrapped = pvc._addView;
      installPvcModalHostPropPropagation(pvc, wrapper);
      const twiceAttempted = pvc._addView;

      expect(onceWrapped).not.toBe(original);
      expect(twiceAttempted).toBe(onceWrapped);
      expect((pvc as unknown as Record<string, unknown>)[PVC_ADD_VIEW_WRAPPED_MARKER]).toBe(true);
    });

    it('preserves `_addView` return value and atIndex semantics so NS internals are not affected', () => {
      // ViewBase._addView is decorated with @profile and has no
      // return value, but ProxyViewContainer's overrides may, and
      // we must thread arguments through verbatim so behavior is
      // identical to the un-wrapped instance.
      const wrapper = new FakeView('wrapper');
      wrapper._dialogFragment = { kind: 'DialogFragment' };
      const pvc = new FakeView('pvc');
      let observedAtIndex: number | undefined = -1;
      pvc._addView = ((view: ModalHostView, atIndex?: number) => {
        observedAtIndex = atIndex;
        return `added:${(view as FakeView).name}` as unknown as void;
      }) as AddViewHost['_addView'];

      installPvcModalHostPropPropagation(pvc, wrapper);

      const newChild = new FakeView('new');
      const result = pvc._addView!(newChild, 7);

      expect(observedAtIndex).toBe(7);
      expect(result).toBe('added:new');
    });

    it('no-ops gracefully when the host has no `_addView` (e.g. an element that is not a View)', () => {
      // Defensive: `componentRef.location.nativeElement` is *almost
      // always* a `ProxyViewContainer`, but a third-party portal
      // outlet could plug in a plain object. The wrap must not
      // explode in that case — leaving the host untouched is the
      // right behavior because HMR re-render of a non-View host is
      // not a real scenario anyway.
      const wrapper = new FakeView('wrapper');
      wrapper._dialogFragment = { kind: 'DialogFragment' };
      const nonViewHost = { _dialogFragment: undefined } as unknown as AddViewHost;

      expect(() => installPvcModalHostPropPropagation(nonViewHost, wrapper)).not.toThrow();
      expect((nonViewHost as unknown as Record<string, unknown>)[PVC_ADD_VIEW_WRAPPED_MARKER]).toBeUndefined();
    });

    it('is safe with nullish inputs', () => {
      expect(() => installPvcModalHostPropPropagation(undefined, undefined)).not.toThrow();
      expect(() => installPvcModalHostPropPropagation(new FakeView(), undefined)).not.toThrow();
      expect(() => installPvcModalHostPropPropagation(undefined, new FakeView())).not.toThrow();
    });

    it('re-reads wrapper host props on each `_addView` call so a re-render after the wrapper was re-stamped sees fresh values', () => {
      // Simulates: dialog opens → wrapper._dialogFragment = A,
      // wrap installed. Later, NS internals re-stamp the wrapper
      // (e.g. DialogFragment was recreated after app suspend — see
      // `_showNativeModalView`'s "Set owner._dialogFragment to
      // this in case the DialogFragment was recreated after app
      // suspend" branch). The wrap must mirror the *current*
      // wrapper value at re-render time, not the stale A.
      const wrapper = new FakeView('wrapper');
      wrapper._dialogFragment = { kind: 'A' };
      const pvc = new FakeView('pvc');
      installPvcModalHostPropPropagation(pvc, wrapper);

      // Wrapper restamp simulating the post-suspend reassign.
      const fresh = { kind: 'B' };
      wrapper._dialogFragment = fresh;

      const newChild = new FakeView('new');
      pvc._addView!(newChild);

      expect(newChild._dialogFragment).toBe(fresh);
    });
  });
});
