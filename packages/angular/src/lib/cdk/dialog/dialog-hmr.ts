import { Subject } from 'rxjs';
import { ComponentType } from '../../utils/general';
import { NativeDialogConfig } from './dialog-config';
import { NativeDialogRef } from './dialog-ref';

/**
 * Dialog opening captured so it can reopen after an HMR reboot.
 */
export interface CapturedHmrDialog {
  componentClass: ComponentType<unknown>;
  componentName: string;
  config: NativeDialogConfig;
  graftAfterClosed: (value: unknown) => void;
}

const STASH_KEY = '__NS_ANGULAR_HMR_PENDING_MODALS__';

/**
 * Filter open dialogs to component openings that opted into preserveOnHmr.
 */
export function selectPreservableDialogs(openDialogs: ReadonlyArray<HmrCandidateDialog>): HmrCandidateDialog[] {
  return openDialogs.filter((dialog) => isPreservable(dialog));
}

export interface HmrCandidateDialog {
  ref: NativeDialogRef<unknown>;
  componentClass?: ComponentType<unknown>;
  config: NativeDialogConfig;
}

function isPreservable(dialog: HmrCandidateDialog): boolean {
  if (!dialog.config?.preserveOnHmr) {
    return false;
  }
  return typeof dialog.componentClass === 'function';
}

/**
 * Stash opted-in open dialogs so the next realm can restore them.
 */
export function captureDialogsForHmr(openDialogs: ReadonlyArray<HmrCandidateDialog>): CapturedHmrDialog[] {
  const preservable = selectPreservableDialogs(openDialogs);
  if (preservable.length === 0) {
    clearPendingHmrDialogs();
    return [];
  }

  const captures: CapturedHmrDialog[] = preservable.map(({ ref, componentClass, config }) => {
    const subject = readAfterClosedSubject(ref);
    // Name survives reboot; the class object may not.
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const componentName = (componentClass! as unknown as { name?: string })?.name ?? '';
    return {
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      componentClass: componentClass!,
      componentName,
      config,
      graftAfterClosed: (value) => {
        if (!subject) {
          return;
        }
        try {
          if (!subject.closed) {
            subject.next(value as never);
            subject.complete();
          }
        } catch {
          // ignore
        }
      },
    };
  });

  (globalThis as unknown as Record<string, unknown>)[STASH_KEY] = captures;
  return captures;
}

/**
 * Drain the pending captures for restore.
 */
export function consumePendingHmrDialogs(): CapturedHmrDialog[] {
  const slot = (globalThis as unknown as Record<string, unknown>)[STASH_KEY];
  if (!Array.isArray(slot)) {
    return [];
  }
  delete (globalThis as unknown as Record<string, unknown>)[STASH_KEY];
  return slot.filter((entry): entry is CapturedHmrDialog => !!entry && typeof (entry as CapturedHmrDialog).componentClass === 'function');
}

/**
 * Drop pending captures without restoring them.
 */
export function clearPendingHmrDialogs(): void {
  delete (globalThis as unknown as Record<string, unknown>)[STASH_KEY];
}

/**
 * Read the current stash without consuming it.
 */
export function peekPendingHmrDialogs(): CapturedHmrDialog[] {
  const slot = (globalThis as unknown as Record<string, unknown>)[STASH_KEY];
  return Array.isArray(slot) ? (slot as CapturedHmrDialog[]).slice() : [];
}

function readAfterClosedSubject(ref: NativeDialogRef<unknown>): Subject<unknown> | undefined {
  const candidate = (ref as unknown as { _afterClosed?: unknown })._afterClosed;
  if (!candidate || typeof candidate !== 'object') {
    return undefined;
  }
  if (typeof (candidate as Subject<unknown>).next !== 'function') {
    return undefined;
  }
  return candidate as Subject<unknown>;
}

/**
 * Release afterClosed waiters when a captured dialog cannot reopen.
 */
export function abortCapturedDialog(captured: CapturedHmrDialog): void {
  try {
    captured.graftAfterClosed(undefined);
  } catch {
    // ignore
  }
}

export function suppressNativeCloseAnimation(candidate: HmrCandidateDialog): void {
  if (!candidate.config?.preserveOnHmr) {
    return;
  }
  try {
    const modalRef = (candidate.ref as unknown as { _nativeModalRef?: { parentView?: unknown } })?._nativeModalRef;
    const parentView = modalRef?.parentView as { _modalAnimatedOptions?: boolean[] } | undefined;
    const stack = parentView?._modalAnimatedOptions;
    if (Array.isArray(stack) && stack.length > 0) {
      stack[stack.length - 1] = false;
    }
  } catch {
    // ignore
  }
}

export function buildNonAnimatedRestoreConfig(original: NativeDialogConfig): NativeDialogConfig {
  const cloned = Object.assign(new NativeDialogConfig(), original) as NativeDialogConfig;
  cloned.nativeOptions = { ...(original?.nativeOptions || {}), animated: false };
  return cloned;
}
