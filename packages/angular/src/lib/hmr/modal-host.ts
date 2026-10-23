export interface ModalHostView {
  _dialogFragment?: unknown;
  viewController?: unknown;
  eachChildView?: (callback: (child: ModalHostView) => boolean) => void;
  _addView?: (view: ModalHostView, atIndex?: number) => void;
}

const ADD_VIEW_PATCHED = '__ng_hmr_modal_add_view__';

/*
 * During HMR, modals present a stable wrapper instead of the component's first view so in-place
 * template updates (ɵɵreplaceMetadata) can swap that view. Core only sets the modal host props
 * (`_dialogFragment` on Android, `viewController` on iOS) on the presented view, and some lookups
 * only check one parent up, so the props are mirrored onto everything inside the wrapper.
 */

/** Copies the wrapper's modal host props onto every descendant of `root`. */
export function copyModalHostProps(wrapper: ModalHostView, root: ModalHostView | undefined): void {
  const { _dialogFragment, viewController } = wrapper;
  if (!root || (_dialogFragment == null && viewController == null)) {
    return;
  }
  const visit = (view: ModalHostView) => {
    if (view !== wrapper) {
      if (_dialogFragment != null) {
        view._dialogFragment = _dialogFragment;
      }
      if (viewController != null) {
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

/** Mirrors the wrapper's modal host props now and onto views the component host gains later. */
export function shareModalHostProps(wrapper: ModalHostView, componentHost: ModalHostView | undefined): void {
  copyModalHostProps(wrapper, wrapper);
  const host = componentHost as (ModalHostView & Record<string, unknown>) | undefined;
  if (!host || host[ADD_VIEW_PATCHED] || typeof host._addView !== 'function') {
    return;
  }
  const addView = host._addView.bind(host);
  // Props must exist before _addView, which fires `loaded` on the new view.
  host._addView = (view, atIndex) => {
    copyModalHostProps(wrapper, view);
    return addView(view, atIndex);
  };
  host[ADD_VIEW_PATCHED] = true;
}
