import { AddViewHost, installPvcModalHostPropPropagation, ModalHostView, propagateModalHostPropsToDescendants, PVC_ADD_VIEW_WRAPPED_MARKER } from './modal-host-props';

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

  _addView(view: ModalHostView, _atIndex?: number): void {
    this.children.push(view as FakeView);
  }
}

describe('modal-host-props', () => {
  describe('propagateModalHostPropsToDescendants', () => {
    it('mirrors `_dialogFragment` and `viewController` from the wrapper onto every native-like descendant', () => {
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
      const dialogFragment = { kind: 'DialogFragment' };
      const wrapper = new FakeView('wrapper');
      wrapper._dialogFragment = dialogFragment;
      const sentinel = wrapper._dialogFragment;

      propagateModalHostPropsToDescendants(wrapper, wrapper);

      expect(wrapper._dialogFragment).toBe(sentinel);
    });

    it('no-ops when the modal has not been shown yet (wrapper has neither host prop)', () => {
      const wrapper = new FakeView('wrapper');
      const stack = new FakeView('stack');
      wrapper.children = [stack];
      stack._dialogFragment = { kind: 'preexisting' };

      propagateModalHostPropsToDescendants(wrapper, wrapper);

      expect(stack._dialogFragment).toEqual({ kind: 'preexisting' });
    });

    it('no-ops when the modal has already closed (NS sets both props to null on the wrapper)', () => {
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
      expect(() => propagateModalHostPropsToDescendants(undefined, undefined)).not.toThrow();
      expect(() => propagateModalHostPropsToDescendants(undefined, new FakeView())).not.toThrow();
      expect(() => propagateModalHostPropsToDescendants(new FakeView(), undefined)).not.toThrow();
    });
  });

  describe('installPvcModalHostPropPropagation', () => {
    it('mirrors host-props onto each child added after install (HMR `ɵɵreplaceMetadata` rerender simulation)', () => {
      const dialogFragment = { kind: 'DialogFragment' };
      const wrapper = new FakeView('wrapper');
      wrapper._dialogFragment = dialogFragment;

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
      const wrapper = new FakeView('wrapper');
      wrapper._dialogFragment = { kind: 'A' };
      const pvc = new FakeView('pvc');
      installPvcModalHostPropPropagation(pvc, wrapper);

      const fresh = { kind: 'B' };
      wrapper._dialogFragment = fresh;

      const newChild = new FakeView('new');
      pvc._addView!(newChild);

      expect(newChild._dialogFragment).toBe(fresh);
    });
  });
});
