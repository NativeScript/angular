export interface ModalHostView {
  _dialogFragment?: unknown;
  viewController?: unknown;
  eachChildView?: (callback: (child: ModalHostView) => boolean) => void;
}

export interface AddViewHost extends ModalHostView {
  _addView?: (view: ModalHostView, atIndex?: number) => void;
}

export const PVC_ADD_VIEW_WRAPPED_MARKER = '__ng_modal_propagate_addview__';

/**
 * Copy wrapper modal-host props onto every descendant of root.
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
 * Wrap host._addView so later children receive wrapper modal-host props.
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
    // loaded fires inside _addView; props must exist first.
    propagateModalHostPropsToDescendants(wrapper, view);
    return origAddView(view, atIndex);
  };
  target[PVC_ADD_VIEW_WRAPPED_MARKER] = true;
}
