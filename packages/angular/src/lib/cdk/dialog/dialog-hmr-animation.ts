import { NativeDialogConfig } from './dialog-config';
import { HmrCandidateDialog } from './dialog-hmr';

/**
 * Best-effort animation helpers used by the dialog HMR layer to make
 * the close + reopen round-trip feel like an in-place content refresh.
 *
 * They live in a tiny standalone module on purpose:
 *
 * - `dialog-services.ts` pulls in `@angular/core`, which Jest cannot
 *   load in our spec runner without an extra ESM transform. By
 *   keeping these helpers free of `@angular/core` we can unit-test
 *   them in isolation (`dialog-hmr-animation.spec.ts`) while
 *   `dialog-services.ts` re-exports them at the public API layer.
 * - The helpers are inherently best-effort: a missing
 *   `_nativeModalRef`, a frozen `_modalAnimatedOptions` stack, or a
 *   future `NativeDialogConfig` shape change must never break HMR
 *   restore — we just fall back to the original animated behavior.
 */

/**
 * Mutate the top of `parentView._modalAnimatedOptions` to `false` for
 * the given candidate so the imminent native close runs un-animated.
 *
 * iOS reads `_modalAnimatedOptions.slice(-1)[0]` when dismissing a
 * modal (see core `view-common.ts` / `view/index.ios.ts`). The
 * Angular dialog service only pushes one entry per open call, so the
 * top entry is the exact flag that controls the dismiss we're about
 * to trigger as part of the HMR root-view replacement.
 */
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
    // Swallow: a missing `_nativeModalRef` / `_modalAnimatedOptions`
    // is acceptable — we just lose the no-animation optimisation.
  }
}

/**
 * Build a `NativeDialogConfig` clone of `original` whose
 * `nativeOptions.animated` is forced to `false`. Used when re-opening
 * a captured modal so the open animation matches the suppressed
 * close — together they make the HMR round-trip feel like a content
 * refresh instead of a close/reopen.
 */
export function buildNonAnimatedRestoreConfig(original: NativeDialogConfig): NativeDialogConfig {
  // Clone via `Object.assign` so consumers holding the original
  // config (e.g. caching it for re-open) don't see mutations from
  // the HMR pathway.
  const cloned = Object.assign(new NativeDialogConfig(), original) as NativeDialogConfig;
  cloned.nativeOptions = { ...(original?.nativeOptions || {}), animated: false };
  return cloned;
}
