/**
 * Pure helpers that mirror NativeScript's modal-host properties
 * (`_dialogFragment` on Android, `viewController` on iOS) from the
 * ContentView wrapper that `attachComponentPortal` presents as the
 * modal down onto every native-like descendant.
 *
 * Why? `parentView.showModal(targetView, ...)` stamps those props on
 * `targetView` itself — but user template code reads them off the
 * rendered template root that lives *inside* the wrapper (e.g.
 * `onLoaded($event)` → `args.object._dialogFragment.getDialog()`).
 * Without mirroring, every fresh modal open + every HMR
 * `ɵɵreplaceMetadata` re-render hands the user `undefined`, which is
 * how we hit:
 *
 *   Cannot read properties of undefined (reading 'getDialog')
 *     at CheckinComponent.onLoaded
 *
 * The helpers live in a standalone module on purpose, mirroring
 * `dialog-hmr-animation.ts`: they don't pull `@angular/core` or
 * `@nativescript/core`, so they're trivially unit-testable in the
 * Jest Node runner without an ESM transform or a NativeScript
 * runtime stub.
 */

/**
 * Structural shape of a NativeScript View used by these helpers.
 * Real `View` instances from `@nativescript/core` satisfy this
 * trivially; tests pass plain objects with the same shape.
 *
 * Only the two host props we mirror and the `eachChildView` walk
 * matter here — keeping the shape tight makes the helpers easy to
 * reason about and prevents leaking unrelated `View` semantics.
 */
export interface ModalHostView {
  _dialogFragment?: unknown;
  viewController?: unknown;
  eachChildView?: (callback: (child: ModalHostView) => boolean) => void;
}

/**
 * Structural shape required to wrap a NativeScript View's `_addView`.
 * `ProxyViewContainer` (the host of an Angular component) satisfies
 * this via `ViewBase._addView`.
 */
export interface AddViewHost extends ModalHostView {
  _addView?: (view: ModalHostView, atIndex?: number) => void;
}

/**
 * Marker property used to make {@link installPvcModalHostPropPropagation}
 * idempotent. Exported only so the spec can assert install
 * idempotency without re-declaring the constant.
 */
export const PVC_ADD_VIEW_WRAPPED_MARKER = '__ng_modal_propagate_addview__';

/**
 * Mirror `wrapper`'s modal-host props onto every descendant of
 * `root` via NativeScript's logical `eachChildView` walk.
 *
 * - The wrapper itself is **never** written to. NS core owns that
 *   assignment and we must not shadow the canonical reference.
 * - Writes are idempotent: a descendant that already holds the same
 *   reference is skipped, so repeat calls (HMR re-renders, multiple
 *   PVC adds in one render pass) stay cheap.
 * - No-op when the modal isn't shown yet, has already closed, or
 *   when either input is missing. NS clears both props to null on
 *   close, so propagating after that point would only persist stale
 *   references on the descendants.
 */
export function propagateModalHostPropsToDescendants(wrapper: ModalHostView | undefined | null, root: ModalHostView | undefined | null): void {
  if (!wrapper || !root) {
    return;
  }
  const dialogFragment = wrapper._dialogFragment;
  const viewController = wrapper.viewController;
  if (dialogFragment == null && viewController == null) {
    return;
  }

  const visit = (view: ModalHostView | undefined): void => {
    if (!view) {
      return;
    }
    if (view !== wrapper) {
      if (dialogFragment !== undefined && view._dialogFragment !== dialogFragment) {
        view._dialogFragment = dialogFragment;
      }
      if (viewController !== undefined && view.viewController !== viewController) {
        view.viewController = viewController;
      }
    }
    view.eachChildView?.((child) => {
      visit(child);
      return true;
    });
  };
  visit(root);
}

/**
 * Idempotently wrap `host._addView` so every child added after
 * install — typically the new template root produced by Angular's
 * `ɵɵreplaceMetadata` HMR cycle — has `wrapper`'s modal-host props
 * mirrored onto it (and its current subtree) **before** NS attaches
 * the view.
 *
 * Why "before"? `_addView` on a loaded parent synchronously calls
 * `child.callLoaded()` deep inside, which fires the `loaded` event
 * chain on the new template root. User code (e.g.
 * `onLoaded($event)` → `args.object._dialogFragment.getDialog()`)
 * runs from inside that synchronous call. The props **must** be
 * present on the child by the time `_addView` runs — pre-hook
 * position is the only place that guarantees this without
 * monkey-patching NS internals.
 *
 * The wrap reads `wrapper._dialogFragment` / `wrapper.viewController`
 * lazily (per call) via {@link propagateModalHostPropsToDescendants},
 * so a wrap installed while the modal is open keeps doing the right
 * thing if HMR re-render happens later, and gracefully no-ops after
 * the modal closes (both props become null on the wrapper).
 *
 * No-op when `host` lacks `_addView` (e.g. a non-View element) or
 * when the wrap is already installed (`PVC_ADD_VIEW_WRAPPED_MARKER`
 * sentinel). The wrap is intentionally NOT removable — the host
 * lives only as long as the modal, so the wrap is GC'd with it.
 */
export function installPvcModalHostPropPropagation(host: AddViewHost | undefined | null, wrapper: ModalHostView | undefined | null): void {
  if (!host || !wrapper) {
    return;
  }
  const target = host as AddViewHost & Record<string, unknown>;
  if (target[PVC_ADD_VIEW_WRAPPED_MARKER] || typeof target._addView !== 'function') {
    return;
  }
  const origAddView = target._addView.bind(target);
  target._addView = (view: ModalHostView, atIndex?: number) => {
    propagateModalHostPropsToDescendants(wrapper, view);
    return origAddView(view, atIndex);
  };
  target[PVC_ADD_VIEW_WRAPPED_MARKER] = true;
}
