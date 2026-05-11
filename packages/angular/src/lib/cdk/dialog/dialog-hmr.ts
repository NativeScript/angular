import { Subject } from 'rxjs';
import { ComponentType } from '../../utils/general';
import { NativeDialogConfig } from './dialog-config';
import { NativeDialogRef } from './dialog-ref';

/**
 * One captured dialog opening, kept around long enough to re-open with the
 * fresh component class after Angular reboots. We deliberately keep this as
 * `unknown`-shaped data (no rxjs `Subject` typing on the public stash) so the
 * boundary between old and new module realms stays narrow.
 */
export interface CapturedHmrDialog {
  /**
   * The component class as it was at capture time. After an HMR reboot
   * this reference is **stale** — the new module realm will export a
   * different class object even though the source class definition is
   * identical. We retain it as a fallback for production-like builds
   * (where no class registry is installed) and for the rare case where
   * a captured component was not loaded through the patched
   * `ɵɵdefineComponent` path.
   */
  componentClass: ComponentType<unknown>;
  /**
   * The captured class's source name (e.g. `ResourceModalComponent`).
   * The dialog restore step uses this name to look up the live class
   * from `hmr-class-registry`, falling back to `componentClass` if the
   * registry has no match.
   */
  componentName: string;
  config: NativeDialogConfig;
  /**
   * The original `_afterClosed` subject from the captured dialog ref. We pipe
   * the restored dialog's `afterClosed()` into this subject so consumers that
   * are awaiting the original `dialogRef.afterClosed()` resolve naturally.
   *
   * Stored as `unknown` because the rxjs class identity may be different
   * between captured-vs-restored realms; the dialog-services consumer
   * narrows it as needed.
   */
  graftAfterClosed: (value: unknown) => void;
}

const STASH_KEY = '__NS_ANGULAR_HMR_PENDING_MODALS__';

function getStashSlot(): { value: CapturedHmrDialog[] | undefined } {
  return globalThis as unknown as { value: CapturedHmrDialog[] | undefined };
}

/**
 * Pure helper: filter the open dialog list down to entries that opted in via
 * `preserveOnHmr` and that we actually know how to restore (component-class
 * openings, not template openings).
 */
export function selectPreservableDialogs(
  openDialogs: ReadonlyArray<HmrCandidateDialog>,
): HmrCandidateDialog[] {
  return openDialogs.filter((dialog) => isPreservable(dialog));
}

export interface HmrCandidateDialog {
  /** The dialog ref we'd graft `afterClosed` onto. */
  ref: NativeDialogRef<unknown>;
  /**
   * The component class used when the dialog was opened. May be `undefined`
   * for `TemplateRef`-based openings — such dialogs are not preservable.
   */
  componentClass?: ComponentType<unknown>;
  /** The original config so we can re-open with identical options. */
  config: NativeDialogConfig;
}

function isPreservable(dialog: HmrCandidateDialog): boolean {
  if (!dialog.config?.preserveOnHmr) {
    return false;
  }
  return typeof dialog.componentClass === 'function';
}

/**
 * Capture the open dialogs that opted into HMR preservation. Returns the
 * captured entries so callers can correlate counts in their logs.
 */
export function captureDialogsForHmr(openDialogs: ReadonlyArray<HmrCandidateDialog>): CapturedHmrDialog[] {
  const preservable = selectPreservableDialogs(openDialogs);
  if (preservable.length === 0) {
    clearPendingHmrDialogs();
    return [];
  }

  const captures: CapturedHmrDialog[] = preservable.map(({ ref, componentClass, config }) => {
    const subject = readAfterClosedSubject(ref);
    // Capture the source name now — the class reference itself becomes
    // stale after the reboot, but the name is stable across realms and
    // is what the post-reboot registry is keyed on.
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const componentName = (componentClass! as unknown as { name?: string })?.name ?? '';
    return {
      // Asserted non-null in `isPreservable`.
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
          // Swallow: the subject may have completed during dispose; nothing for us to do.
        }
      },
    };
  });

  (globalThis as unknown as Record<string, unknown>)[STASH_KEY] = captures;
  return captures;
}

/**
 * Drain the pending captures. The caller (the new `NativeDialog`) is expected
 * to re-open each entry and graft `afterClosed` back into the original
 * subject.
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
 * Remove the pending captures without restoring. Useful when a reboot happens
 * for reasons other than module replacement (e.g. platform dispose) and we
 * don't want stale modal state to leak into the next bootstrap.
 */
export function clearPendingHmrDialogs(): void {
  delete (globalThis as unknown as Record<string, unknown>)[STASH_KEY];
}

/**
 * Test/debug helper: read the current stash without consuming it.
 */
export function peekPendingHmrDialogs(): CapturedHmrDialog[] {
  const slot = (globalThis as unknown as Record<string, unknown>)[STASH_KEY];
  return Array.isArray(slot) ? (slot as CapturedHmrDialog[]).slice() : [];
}

/**
 * Reach into the dialog ref's private `_afterClosed` subject. We touch the
 * private field intentionally — the ref class lives inside this package and
 * we want HMR restore to be a feature of the dialog system rather than a
 * reason to widen its public surface for everyone.
 */
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
 * Used by the resume-side: if the stash references something that can no
 * longer be opened (e.g. the component class is dead post-reload), we still
 * need to release its consumers so awaited promises don't dangle forever.
 */
export function abortCapturedDialog(captured: CapturedHmrDialog): void {
  try {
    captured.graftAfterClosed(undefined);
  } catch {
    // Best-effort.
  }
}
