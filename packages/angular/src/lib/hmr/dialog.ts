import { ApplicationRef, type Injector, type Type } from '@angular/core';
import { Application } from '@nativescript/core';
import type { NativeDialogConfig } from '../cdk/dialog/dialog-config';
import type { NativeDialogRef } from '../cdk/dialog/dialog-ref';
import { getHmrComponentClass, hmrLog, hmrState, registerHmrHooks } from './hmr';

interface DialogOpener {
  open(component: Type<unknown>, config: NativeDialogConfig): NativeDialogRef<unknown>;
}

interface PreservedDialog {
  component: Type<unknown>;
  config: NativeDialogConfig;
}

const ROOT_VIEW_WAIT_MS = 1000;
const STABLE_WAIT_MS = 2000;
const open = new Map<NativeDialogRef<unknown>, PreservedDialog>();

/**
 * Remembers a component dialog opened with `preserveOnHmr` so the next reboot can reopen it.
 * @param dialogToken the NativeDialog class, passed in to avoid an import cycle with the service.
 */
export function trackHmrDialog(
  dialogToken: Type<DialogOpener>,
  ref: NativeDialogRef<unknown>,
  component: Type<unknown>,
  config: NativeDialogConfig,
): void {
  if (!config.preserveOnHmr) {
    return;
  }
  open.set(ref, { component, config });
  ref.afterClosed().subscribe(() => open.delete(ref));
  registerHmrHooks('dialog', {
    beforeDispose: captureDialogs,
    afterBootstrap: (injector) => restoreDialogs(injector, dialogToken),
  });
}

function captureDialogs(): void {
  hmrState().dialogs = [...open.entries()].map(([ref, dialog]) => {
    suppressCloseAnimation(ref);
    return dialog;
  });
  open.clear();
}

function restoreDialogs(injector: Injector, dialogToken: Type<DialogOpener>): void {
  const state = hmrState();
  const pending = state.dialogs as PreservedDialog[];
  if (!pending.length) {
    return;
  }
  state.dialogs = [];
  // Waiting for stability lets the initial navigation lazy-load (and so re-evaluate) edited dialog components.
  // Capped because apps with recurring timers under zone.js never become stable.
  const settled = Promise.race([
    injector.get(ApplicationRef).whenStable(),
    new Promise((resolve) => setTimeout(resolve, STABLE_WAIT_MS)),
  ]);
  void settled.then(() =>
    whenRootViewLoaded(() => {
      const dialog = injector.get(dialogToken);
      for (const { component, config } of pending) {
        const fresh = getHmrComponentClass<Type<unknown>>(component.name) ?? component;
        try {
          // The original view container and injector were destroyed with the previous app.
          dialog.open(fresh, {
            ...config,
            viewContainerRef: undefined,
            injector: undefined,
            renderIn: 'root',
            nativeOptions: { ...config.nativeOptions, animated: false },
          });
          hmrLog(`reopened dialog ${component.name}`);
        } catch (err) {
          hmrLog(`could not reopen dialog ${component.name}: ${(err as Error)?.message ?? err}`);
        }
      }
    }),
  );
}

// The disposing app closes its modals; skip the close animation so the reopen looks seamless.
function suppressCloseAnimation(ref: NativeDialogRef<unknown>): void {
  const parentView = (ref as unknown as { _nativeModalRef?: { parentView?: { _modalAnimatedOptions?: boolean[] } } })
    ._nativeModalRef?.parentView;
  const animated = parentView?._modalAnimatedOptions;
  if (animated?.length) {
    animated[animated.length - 1] = false;
  }
}

function whenRootViewLoaded(callback: () => void): void {
  const started = Date.now();
  const check = () => {
    const root = Application.getRootView();
    if (root?.isLoaded) {
      // Let the new root finish attaching before presenting on top of it.
      setTimeout(callback);
    } else if (Date.now() - started < ROOT_VIEW_WAIT_MS) {
      setTimeout(check, 16);
    } else {
      hmrLog('dialog restore skipped: root view never loaded');
    }
  };
  check();
}
