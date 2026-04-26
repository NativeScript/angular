/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import {
  inject,
  Injectable,
  InjectionToken,
  Injector,
  OnDestroy,
  StaticProvider,
  TemplateRef,
  Type,
} from '@angular/core';
import { Application, View } from '@nativescript/core';
import { defer, Observable, Subject, Subscription } from 'rxjs';
import { startWith } from 'rxjs/operators';
import { postAngularBootstrap$, preAngularDisposal$ } from '../../application';
import { isAngularHmrEnabled } from '../../hmr-environment';
import { getFreshComponentClass } from '../../hmr-class-registry';
import { registerHmrEagerInstantiator } from '../../hmr-eager-services';
import { NSLocationStrategy } from '../../legacy/router/ns-location-strategy';
import { NativeScriptDebug } from '../../trace';
import { ComponentType } from '../../utils/general';
import { ComponentPortal, TemplatePortal } from '../portal/common';
import { NativeDialogConfig } from './dialog-config';
import {
  abortCapturedDialog,
  captureDialogsForHmr,
  CapturedHmrDialog,
  clearPendingHmrDialogs,
  consumePendingHmrDialogs,
  HmrCandidateDialog,
  peekPendingHmrDialogs,
} from './dialog-hmr';
import { buildNonAnimatedRestoreConfig, suppressNativeCloseAnimation } from './dialog-hmr-animation';
import { NativeDialogRef } from './dialog-ref';
import { NativeModalRef } from './native-modal-ref';

/**
 * Always-visible HMR diagnostic prefix. We use the same `[ns-hmr][angular]`
 * tag the Vite Angular client uses for refresh/reboot lines so devs see
 * dialog HMR events on the same console channel without flipping
 * `Trace.isEnabled()` (which is off by default and gates
 * `NativeScriptDebug.hmrLog`). The helper short-circuits in production
 * because every caller is already gated on `isAngularHmrEnabled()`.
 */
function hmrDialogLog(message: string): void {
  if (!isAngularHmrEnabled()) {
    return;
  }
  console.info(`[ns-hmr][angular][dialog] ${message}`);
}

/**
 * Diagnostic helper. Distinct from `hmrDialogLog` so we can grep
 * separately for "low-level wiring" facts (module-realm count,
 * NativeDialog instance count, registry hits/misses) vs. high-level
 * lifecycle messages.
 */
function hmrDialogDiag(message: string): void {
  if (!isAngularHmrEnabled()) {
    return;
  }
  console.info(`[ns-hmr-diag][dialog] ${message}`);
}

/**
 * Module-evaluation marker. Increments on every fresh evaluation of
 * `dialog-services.ts`. If we see this number rise on every HMR cycle,
 * the file is being re-evaluated (good). If it stays flat, the module
 * is being served from cache (bad — class identities won't change).
 */
const DIALOG_MODULE_DIAG_KEY = '__NS_HMR_DIAG_DIALOG_MODULE__';
interface DialogModuleDiag {
  evals: number;
  instances: number;
  lastEvalAt: number;
}
function getDialogModuleDiag(): DialogModuleDiag {
  const slot = globalThis as unknown as { [DIALOG_MODULE_DIAG_KEY]?: DialogModuleDiag };
  if (!slot[DIALOG_MODULE_DIAG_KEY]) {
    slot[DIALOG_MODULE_DIAG_KEY] = { evals: 0, instances: 0, lastEvalAt: 0 };
  }
  return slot[DIALOG_MODULE_DIAG_KEY]!;
}
{
  const md = getDialogModuleDiag();
  md.evals += 1;
  md.lastEvalAt = Date.now();
  hmrDialogDiag(`module-eval count=${md.evals} (file=dialog-services.ts) timestamp=${md.lastEvalAt}`);
}

/** Injection token that can be used to access the data that was passed in to a dialog. */
export const NATIVE_DIALOG_DATA = new InjectionToken<any>('NativeDialogData');

/** Injection token that can be used to specify default dialog options. */
export const NATIVE_DIALOG_DEFAULT_OPTIONS = new InjectionToken<NativeDialogConfig>('native-dialog-default-options');

/**
 * Base class for dialog services. The base dialog service allows
 * for arbitrary dialog refs and dialog container components.
 */
@Injectable({
  providedIn: 'root',
})
export class NativeDialog implements OnDestroy {
  /**
   * Diagnostic instance id. We tag each constructor with a number so
   * the logs make it obvious when a stale `NativeDialog` keeps
   * receiving events after a reboot (e.g. due to a leaked subscription
   * or a service from a previous realm being kept alive).
   */
  private readonly _diagInstanceId: number;
  private _openDialogsAtThisLevel: NativeDialogRef<any>[] = [];
  private readonly _afterAllClosedAtThisLevel = new Subject<void>();
  private readonly _afterOpenedAtThisLevel = new Subject<NativeDialogRef<any>>();
  /**
   * Maps each open dialog ref back to the `(componentClass, config)` pair it
   * was opened with so the HMR snapshot can replay the call later. Dialogs
   * opened with a `TemplateRef` are tracked with `componentClass: undefined`
   * — the HMR layer skips them automatically.
   */
  private readonly _openDialogMetadata = new WeakMap<NativeDialogRef<any>, { componentClass?: ComponentType<any>; config: NativeDialogConfig }>();
  private _hmrSubscriptions: Subscription[] = [];
  // TODO (jelbourn): tighten the typing right-hand side of this expression.
  /**
   * Stream that emits when all open dialog have finished closing.
   * Will emit on subscribe if there are no open dialogs to begin with.
   */
  readonly afterAllClosed: Observable<void> = defer(() =>
    this.openDialogs.length
      ? this._getAfterAllClosed()
      : this._getAfterAllClosed().pipe(startWith<any, any>(undefined)),
  ) as Observable<any>;

  /** Keeps track of the currently-open dialogs. */
  get openDialogs(): NativeDialogRef<any>[] {
    return this._parentDialog ? this._parentDialog.openDialogs : this._openDialogsAtThisLevel;
  }

  /** Stream that emits when a dialog has been opened. */
  get afterOpened(): Subject<NativeDialogRef<any>> {
    return this._parentDialog ? this._parentDialog.afterOpened : this._afterOpenedAtThisLevel;
  }

  _getAfterAllClosed(): Subject<void> {
    const parent = this._parentDialog;
    return parent ? parent._getAfterAllClosed() : this._afterAllClosedAtThisLevel;
  }
  private _injector = inject(Injector);
  private _defaultOptions = inject(NATIVE_DIALOG_DEFAULT_OPTIONS, {
    optional: true,
  });
  private _parentDialog = inject(NativeDialog, { optional: true, skipSelf: true });
  private _dialogRefConstructor: Type<NativeDialogRef<any>> = NativeDialogRef;
  private _nativeModalType = NativeModalRef;
  private _dialogDataToken = NATIVE_DIALOG_DATA;
  private locationStrategy = inject(NSLocationStrategy);
  // Bumps a global counter so we can detect duplicate or leaked
  // `NativeDialog` instances across HMR cycles. Field initialiser
  // ordering: this MUST run before `_initHmrLifecycle()` below so the
  // log line in that helper can include the assigned id.
  private _diagInstanceIdAssign = ((): null => {
    const md = getDialogModuleDiag();
    md.instances += 1;
    (this as unknown as { _diagInstanceId: number })._diagInstanceId = md.instances;
    hmrDialogDiag(
      `NativeDialog ctor instanceId=${md.instances} hasParentDialog=${!!this._parentDialog} moduleEvalCount=${md.evals}`,
    );
    return null;
  })();
  // Initialise after every dependency above so the subscriptions can call
  // back into `this.open(...)` and `this.openDialogs` safely. The result is
  // unused — we just want a side-effect at construction time.
  private _hmrInitMarker = this._initHmrLifecycle();
  /**
   * Opens a modal dialog containing the given component.
   * @param component Type of the component to load into the dialog.
   * @param config Extra configuration options.
   * @returns Reference to the newly-opened dialog.
   */
  open<T, D = any, R = any>(component: ComponentType<T>, config?: NativeDialogConfig<D>): NativeDialogRef<T, R>;

  /**
   * Opens a modal dialog containing the given template.
   * @param template TemplateRef to instantiate as the dialog content.
   * @param config Extra configuration options.
   * @returns Reference to the newly-opened dialog.
   */
  open<T, D = any, R = any>(template: TemplateRef<T>, config?: NativeDialogConfig<D>): NativeDialogRef<T, R>;

  open<T, D = any, R = any>(
    template: ComponentType<T> | TemplateRef<T>,
    config?: NativeDialogConfig<D>,
  ): NativeDialogRef<T, R>;

  open<T, D = any, R = any>(
    componentOrTemplateRef: ComponentType<T> | TemplateRef<T>,
    config?: NativeDialogConfig<D>,
  ): NativeDialogRef<T, R> {
    config = _applyConfigDefaults(config, this._defaultOptions || new NativeDialogConfig());

    if (config.id && this.getDialogById(config.id) && (typeof ngDevMode === 'undefined' || ngDevMode)) {
      throw Error(`Dialog with id "${config.id}" exists already. The dialog id must be unique.`);
    }
    const dialogRef = this._attachDialogContent<T, R>(componentOrTemplateRef, config);

    this.openDialogs.push(dialogRef);
    this._openDialogMetadata.set(dialogRef, {
      componentClass: componentOrTemplateRef instanceof TemplateRef ? undefined : (componentOrTemplateRef as ComponentType<T>),
      config,
    });
    dialogRef.afterClosed().subscribe(() => this._removeOpenDialog(dialogRef));
    this.afterOpened.next(dialogRef);

    // Notify the dialog container that the content has been attached.
    // dialogContainer._initializeWithAttachedContent();

    return dialogRef;
  }

  /**
   * Closes all of the currently-open dialogs.
   */
  closeAll(): void {
    this._closeDialogs(this.openDialogs);
  }

  /**
   * Finds an open dialog by its id.
   * @param id ID to use when looking up the dialog.
   */
  getDialogById(id: string): NativeDialogRef<any> | undefined {
    return this.openDialogs.find((dialog) => dialog.id === id);
  }

  ngOnDestroy() {
    hmrDialogDiag(
      `NativeDialog ngOnDestroy instanceId=${this._diagInstanceId} openCount=${this._openDialogsAtThisLevel.length} subCount=${this._hmrSubscriptions.length}`,
    );
    // Only close the dialogs at this level on destroy
    // since the parent service may still be active.
    this._closeDialogs(this._openDialogsAtThisLevel);
    this._afterAllClosedAtThisLevel.complete();
    this._afterOpenedAtThisLevel.complete();
    for (const sub of this._hmrSubscriptions) {
      try {
        sub.unsubscribe();
      } catch {
        // Best-effort: tearing down the dialog service shouldn't prevent the
        // rest of the module disposal from completing.
      }
    }
    this._hmrSubscriptions = [];
  }

  /**
   * Tracks whether a restore has already been scheduled for this
   * `NativeDialog` instance's lifetime. We only need to restore once
   * per HMR cycle — the rxjs `ReplaySubject(1)` for
   * `postAngularBootstrap$` delivers both the *previous* cycle's
   * cached event (replay on subscribe) **and** the *current* cycle's
   * fresh event, and the constructor stash peek can independently
   * notice pending work. Without this guard each of those triggers
   * would queue its own `setTimeout` and the logs would show two or
   * three "scheduling restore" lines per save.
   *
   * The guard is per-instance and the stash itself is the source of
   * truth: `_restorePendingDialogs` calls `consumePendingHmrDialogs()`
   * which atomically clears the stash, so even if the guard somehow
   * fired twice, only the first call would do real work.
   */
  private _restoreScheduledForThisInstance = false;

  /**
   * Wires up HMR capture/restore. Only the root-level dialog manages the
   * stash so a stack of `NativeDialog` instances inside a child injector
   * doesn't fight for it.
   *
   * Production short-circuit: `isAngularHmrEnabled()` returns `false` in
   * release builds and when no NS Vite / webpack HMR runtime is present,
   * so the long-lived subscriptions below never attach in shipping apps.
   *
   * `postAngularBootstrap$` is a `ReplaySubject(1)` (see `application.ts`)
   * which means a `NativeDialog` instantiated *after* the bootstrap event
   * has already fired (typical when the user app injects `NativeDialog`
   * lazily via a service like `view.service.ts`) still receives the
   * buffered event and runs the restore path.
   */
  private _initHmrLifecycle(): null {
    if (this._parentDialog) {
      hmrDialogDiag(`_initHmrLifecycle skipped (has parent dialog) instanceId=${this._diagInstanceId}`);
      return null;
    }

    if (!isAngularHmrEnabled()) {
      return null;
    }

    hmrDialogDiag(
      `_initHmrLifecycle wiring up subscriptions instanceId=${this._diagInstanceId} moduleEvalCount=${getDialogModuleDiag().evals}`,
    );

    const dispose = preAngularDisposal$.subscribe((event) => {
      if (event.moduleType !== 'main' || event.reason !== 'hotreload') {
        return;
      }
      hmrDialogDiag(`preAngularDisposal$ fired (reason=${event.reason}) instanceId=${this._diagInstanceId}`);
      this._captureOpenDialogsForHmr();
    });

    const bootstrap = postAngularBootstrap$.subscribe((event) => {
      if (event.moduleType !== 'main' || event.reason !== 'hotreload') {
        return;
      }
      hmrDialogDiag(`postAngularBootstrap$ fired (reason=${event.reason}) instanceId=${this._diagInstanceId}`);
      this._maybeScheduleRestore(`postAngularBootstrap$ (reason=${event.reason})`);
    });

    this._hmrSubscriptions.push(dispose, bootstrap);

    // Belt-and-suspenders: even though `postAngularBootstrap$` replays
    // the last event for late subscribers, also peek the global stash
    // here. This catches the case where `NativeDialog` is instantiated
    // lazily — *after* `emitModuleBootstrapEvent` has fired and the
    // ReplaySubject's buffered event no longer matches the current
    // cycle. The `_maybeScheduleRestore` guard makes this a no-op when
    // the bootstrap subscriber already queued work.
    const pendingNow = peekPendingHmrDialogs();
    hmrDialogDiag(`_initHmrLifecycle stash peek pending=${pendingNow.length} instanceId=${this._diagInstanceId}`);
    if (pendingNow.length > 0) {
      this._maybeScheduleRestore(`stash peek on ctor: ${pendingNow.length} pending dialog(s)`);
    }
    return null;
  }

  /**
   * Schedule a restore exactly once per `NativeDialog` instance.
   *
   * The work is deferred to the next macrotask for two reasons:
   *
   *  1. `postAngularBootstrap$.next(...)` is fired from inside
   *     `emitModuleBootstrapEvent`, which itself runs inside the
   *     `bootstrapApplication` callback — so the call stack still
   *     contains Angular's ApplicationRef bootstrap pipeline. Doing
   *     `this.open(...)` synchronously re-entered Angular DI while a
   *     `providedIn: 'root'` factory could still be on the resolution
   *     stack, which surfaced as `NG0200: Circular dependency detected
   *     for NativeDialog`. Yielding to a macrotask lets the bootstrap
   *     stack fully unwind first.
   *  2. The eventual `parent.showModal(...)` cannot present onto a
   *     view controller whose view is not yet in the iOS window
   *     hierarchy (see `_scheduleRestoreOpenWhenReady` for the second
   *     wait stage); a synchronous attempt would silently no-op
   *     because iOS rejects the present without throwing.
   */
  private _maybeScheduleRestore(triggerDescription: string): void {
    if (this._restoreScheduledForThisInstance) {
      hmrDialogDiag(
        `_maybeScheduleRestore SKIP duplicate trigger=${triggerDescription} instanceId=${this._diagInstanceId}`,
      );
      return;
    }
    this._restoreScheduledForThisInstance = true;
    hmrDialogLog(`scheduling restore (trigger=${triggerDescription}) instanceId=${this._diagInstanceId}`);
    setTimeout(() => {
      void this._restorePendingDialogs();
    }, 0);
  }

  private _captureOpenDialogsForHmr(): void {
    const candidates: HmrCandidateDialog[] = this._openDialogsAtThisLevel.map((ref) => {
      const meta = this._openDialogMetadata.get(ref);
      return {
        ref,
        componentClass: meta?.componentClass,
        config: meta?.config ?? new NativeDialogConfig(),
      };
    });

    hmrDialogDiag(
      `_captureOpenDialogsForHmr instanceId=${this._diagInstanceId} candidates=${candidates.length} (${candidates.map((c) => `${(c.componentClass as { name?: string } | undefined)?.name ?? '(template)'}|preserveOnHmr=${!!c.config?.preserveOnHmr}`).join(', ')})`,
    );

    const captured = captureDialogsForHmr(candidates);

    if (captured.length > 0) {
      // Suppress the close animation that's about to fire as part of
      // `_closeAllModalViewsInternal()` during root-view replacement.
      // Without this the user sees a slide-down + slide-up flicker
      // wrapping every HMR reboot.
      for (const candidate of candidates) {
        suppressNativeCloseAnimation(candidate);
      }
      hmrDialogLog(`captured ${captured.length} dialog(s) for HMR restore [${captured.map((c) => c.componentName).join(', ')}]`);
    } else if (this._openDialogsAtThisLevel.length > 0) {
      hmrDialogLog(`skipped capture: ${this._openDialogsAtThisLevel.length} open dialog(s) but none preservable`);
    }

    if (captured.length > 0 && NativeScriptDebug.isLogEnabled()) {
      NativeScriptDebug.hmrLog(`captured ${captured.length} dialog(s) for HMR restore`);
    }
  }

  /**
   * Per-cycle guard to keep `_restorePendingDialogs` idempotent if more
   * than one subscriber fires for the same bootstrap event. The
   * regression we have seen (`postAngularBootstrap$ → restore` logged
   * twice in the same hot reload) was caused by the `NativeDialogModule`
   * also listing `NativeDialog` in its `providers` array. That has been
   * removed, but we keep this flag as a defensive net so a future stray
   * subscription does not consume the stash twice. The flag is reset
   * after the consume so subsequent HMR cycles can run their own
   * restore.
   */
  private _restoreInFlight = false;

  private async _restorePendingDialogs(): Promise<void> {
    if (this._restoreInFlight) {
      hmrDialogLog('skipping restore: already in flight');
      return;
    }
    const pending = consumePendingHmrDialogs();
    if (pending.length === 0) {
      return;
    }
    this._restoreInFlight = true;

    hmrDialogLog(`restoring ${pending.length} dialog(s) after reboot [${pending.map((c) => c.componentName).join(', ')}]`);

    if (NativeScriptDebug.isLogEnabled()) {
      NativeScriptDebug.hmrLog(`restoring ${pending.length} dialog(s) after HMR reboot`);
    }

    try {
      for (const captured of pending) {
        this._restoreSingleDialog(captured);
      }
    } finally {
      this._restoreInFlight = false;
    }
  }

  /**
   * Resolve the freshest known class object for the captured component
   * name and re-open the dialog through the normal `open` path, but
   * only once the new root view is actually attached to the iOS window
   * hierarchy.
   *
   * Why a class lookup at all: an HMR reboot calls
   * `ɵresetCompiledComponents()` which clears each component's `ɵcmp`
   * field but **leaves the class identity unchanged**. The patched
   * `ɵɵdefineComponent` then re-registers the same class object under
   * the same source name when Angular re-renders the component. A
   * fresh-class lookup therefore returns either the same object the
   * stash captured (most common) or, on the rare occasion that the
   * source file's `@Component` decorator was re-evaluated into a brand
   * new class object (e.g. the user added `@Component(...)` to a new
   * exported symbol), the live one. Either way, a single check is
   * enough — the previous retry schedule was a no-op in 100 % of
   * observed cycles because the captured class IS the live class.
   */
  private _restoreSingleDialog(captured: CapturedHmrDialog): void {
    const live = getFreshComponentClass<ComponentType<unknown>>(captured.componentName);
    const componentClass = live ?? captured.componentClass;
    const usingFresh = !!live && live !== captured.componentClass;
    // Detailed diagnostic to disambiguate the three reasons
    // `usingFreshClass=false` could log:
    //   1. liveDefined=false: the patched ɵɵdefineComponent never
    //      registered a class for this name in the new realm. Most
    //      likely cause: the component module was not re-evaluated
    //      after the eviction (file not in `evictPaths`, or runtime
    //      did not actually evict it).
    //   2. liveDefined=true but live === captured: the file WAS
    //      re-evaluated, but the registry still hands back the same
    //      class object. This shouldn't happen post-reboot for a
    //      truly fresh realm; if it does, the captured snapshot was
    //      taken from the same realm that's now serving the live
    //      class — i.e. the disposal path is not actually disposing
    //      the old realm before the new one boots.
    //   3. liveDefined=true and live !== captured: usingFresh path,
    //      the registry IS doing its job. This is the success case.
    const liveDefined = !!live;
    const sameAsCapture = liveDefined && live === captured.componentClass;
    hmrDialogDiag(
      `_restoreSingleDialog name=${captured.componentName} liveDefined=${liveDefined} sameAsCapture=${sameAsCapture} usingFresh=${usingFresh} capturedFnName=${(captured.componentClass as unknown as { name?: string })?.name ?? '(none)'} liveFnName=${(live as unknown as { name?: string } | undefined)?.name ?? '(none)'}`,
    );
    this._scheduleRestoreOpenWhenReady(captured, componentClass, usingFresh);
  }

  /**
   * Maximum time we'll wait for the new root view to attach to the
   * iOS window before giving up and trying the open anyway. NS Vite's
   * worst observed reboot-to-rootview-loaded gap is ~250 ms; one
   * second leaves headroom for slower devices without leaving the
   * captured dialog stuck in the stash if something genuinely goes
   * wrong.
   */
  private static readonly _ROOT_VIEW_LOADED_TIMEOUT_MS = 1_000;

  /**
   * Defer the actual `this.open(...)` call until the new root view's
   * underlying iOS `UIViewController.view` is in the window hierarchy.
   *
   * iOS silently rejects `presentViewControllerAnimatedCompletion` if
   * the parent controller's view is not yet attached to a `UIWindow`
   * (see `view/index.ios.ts::_showNativeModalView`, which logs to
   * `Trace` and returns without throwing). In dev that would surface
   * as a vanished modal with no actionable error.
   *
   * NS marks a view as `isLoaded === true` from
   * `UILayoutViewController.viewWillAppear`, which fires once iOS has
   * decided to add the view to its window. Listening for the
   * `loadedEvent` (one-shot) plus an extra macrotask gives UIKit a
   * chance to finish window attachment before we present.
   */
  private _scheduleRestoreOpenWhenReady(
    captured: CapturedHmrDialog,
    componentClass: ComponentType<unknown>,
    usingFresh: boolean,
  ): void {
    const rootView = Application.getRootView();

    if (rootView && rootView.isLoaded) {
      // Even when isLoaded is already true we yield once: a previous
      // capture in the same hot reload cycle may have set isLoaded on
      // the *outgoing* root view and a new root view is about to take
      // over. A single setTimeout(0) gives `setWindowContent` a chance
      // to finish swapping `win.rootViewController` before we try to
      // present on top of it.
      setTimeout(() => this._performRestoreOpen(captured, componentClass, usingFresh), 0);
      return;
    }

    if (!rootView) {
      // No root view at all yet — extremely unusual at this point in
      // the bootstrap, but protect against it by polling. We use the
      // same timeout budget as the loaded path.
      this._pollForRootView(captured, componentClass, usingFresh, Date.now());
      return;
    }

    hmrDialogLog(`restore ${captured.componentName} waiting for root view loadedEvent`);

    let settled = false;
    const onLoaded = () => {
      if (settled) return;
      settled = true;
      try {
        rootView.off(View.loadedEvent, onLoaded);
      } catch {
        // off may throw on stale view bindings; the `settled` flag
        // already prevents a double-fire.
      }
      // Defer one tick after viewWillAppear so UIKit completes the
      // actual window attachment (`view.window` is set during the
      // view-controller transition that follows viewWillAppear).
      setTimeout(() => this._performRestoreOpen(captured, componentClass, usingFresh), 0);
    };

    try {
      rootView.once(View.loadedEvent, onLoaded);
    } catch {
      // If the event subscription fails (ancient core builds), fall
      // back to a tiny delay — better to attempt the open and have
      // iOS log a benign trace than to leak the dialog stash.
      setTimeout(() => onLoaded(), 50);
    }

    // Bound the wait so a never-loading root view can't permanently
    // pin the captured dialog in the stash.
    setTimeout(() => {
      if (settled) return;
      hmrDialogLog(`restore ${captured.componentName} root view never loaded within ${NativeDialog._ROOT_VIEW_LOADED_TIMEOUT_MS}ms; attempting open anyway`);
      onLoaded();
    }, NativeDialog._ROOT_VIEW_LOADED_TIMEOUT_MS);
  }

  private _pollForRootView(
    captured: CapturedHmrDialog,
    componentClass: ComponentType<unknown>,
    usingFresh: boolean,
    startedAt: number,
  ): void {
    const rootView = Application.getRootView();
    if (rootView) {
      this._scheduleRestoreOpenWhenReady(captured, componentClass, usingFresh);
      return;
    }
    if (Date.now() - startedAt > NativeDialog._ROOT_VIEW_LOADED_TIMEOUT_MS) {
      hmrDialogLog(`restore ${captured.componentName} aborted: no root view after ${NativeDialog._ROOT_VIEW_LOADED_TIMEOUT_MS}ms`);
      abortCapturedDialog(captured);
      return;
    }
    setTimeout(() => this._pollForRootView(captured, componentClass, usingFresh, startedAt), 16);
  }

  private _performRestoreOpen(
    captured: CapturedHmrDialog,
    componentClass: ComponentType<unknown>,
    usingFresh: boolean,
  ): void {
    hmrDialogLog(`restore ${captured.componentName} usingFreshClass=${usingFresh}`);
    if (NativeScriptDebug.isLogEnabled() && usingFresh) {
      NativeScriptDebug.hmrLog(`HMR modal restore using fresh class for ${captured.componentName}`);
    }

    // Force the restored modal to open without animation so the round-
    // trip looks like an instant content refresh rather than a full
    // close-and-reopen sequence.
    const restoreConfig = buildNonAnimatedRestoreConfig(captured.config);

    try {
      const newRef = this.open(componentClass, restoreConfig);
      hmrDialogLog(`restore ${captured.componentName} → opened newRef.id=${newRef?.id ?? 'n/a'}`);
      newRef.afterClosed().subscribe({
        next: (value) => captured.graftAfterClosed(value),
        complete: () => captured.graftAfterClosed(undefined),
      });
    } catch (err) {
      abortCapturedDialog(captured);
      const message = (err as Error)?.message ?? String(err);
      hmrDialogLog(`restore ${captured.componentName} FAILED: ${message}`);
      if (NativeScriptDebug.isLogEnabled()) {
        NativeScriptDebug.hmrLogError(`HMR modal restore failed: ${message}`);
      }
    }
  }

  /**
   * Test/debug helper: discard any captured modals without restoring them.
   * Mostly useful when projects want to opt out of restoration without
   * recompiling. Public callers should prefer `preserveOnHmr: false` instead.
   */
  static _clearPendingHmrDialogs(): void {
    clearPendingHmrDialogs();
  }

  /**
   * Attaches the user-provided component to the already-created dialog container.
   * @param componentOrTemplateRef The type of component being loaded into the dialog,
   *     or a TemplateRef to instantiate as the content.
   * @param dialogContainer Reference to the wrapping dialog container.
   * @param overlayRef Reference to the overlay in which the dialog resides.
   * @param config The dialog configuration.
   * @returns A promise resolving to the MatDialogRef that should be returned to the user.
   */
  private _attachDialogContent<T, R>(
    componentOrTemplateRef: ComponentType<T> | TemplateRef<T>,
    config: NativeDialogConfig,
  ): NativeDialogRef<T, R> {
    // Create a reference to the dialog we're creating in order to give the user a handle
    // to modify and close it.
    const nativeModalRef = new this._nativeModalType(config, this._injector, this.locationStrategy);
    const dialogRef = new this._dialogRefConstructor(nativeModalRef, config.id);

    if (componentOrTemplateRef instanceof TemplateRef) {
      //     const detachedFactory = options.resolver.resolveComponentFactory(DetachedLoader);
      //     if(options.attachToContainerRef) {
      //         detachedLoaderRef = options.attachToContainerRef.createComponent(detachedFactory, 0, childInjector, null);
      //     } else {
      //         detachedLoaderRef = detachedFactory.create(childInjector); // this DetachedLoader is **completely** detached
      //         this.appRef.attachView(detachedLoaderRef.hostView); // we attach it to the applicationRef, so it becomes a "root" view in angular's hierarchy
      //     }
      //     detachedLoaderRef.changeDetectorRef.detectChanges(); // force a change detection
      //     detachedLoaderRef.instance.createTemplatePortal(options.templateRef);
      nativeModalRef.attachTemplatePortal(
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        new TemplatePortal<T>(componentOrTemplateRef, null!, <any>{ $implicit: config.data, dialogRef }),
      );
    } else {
      const injector = this._createInjector<T>(config, dialogRef);
      const contentRef = nativeModalRef.attachComponentPortal<T>(
        new ComponentPortal(componentOrTemplateRef, config.viewContainerRef, injector),
      );
      dialogRef.componentInstance = contentRef.instance;
    }

    return dialogRef;
  }

  /**
   * Creates a custom injector to be used inside the dialog. This allows a component loaded inside
   * of a dialog to close itself and, optionally, to return a value.
   * @param config Config object that is used to construct the dialog.
   * @param dialogRef Reference to the dialog.
   * @param dialogContainer Dialog container element that wraps all of the contents.
   * @returns The custom injector that can be used inside the dialog.
   */
  private _createInjector<T>(config: NativeDialogConfig, dialogRef: NativeDialogRef<T>): Injector {
    const userInjector = config && config.viewContainerRef && config.viewContainerRef.injector;

    // The dialog container should be provided as the dialog container and the dialog's
    // content are created out of the same `ViewContainerRef` and as such, are siblings
    // for injector purposes. To allow the hierarchy that is expected, the dialog
    // container is explicitly provided in the injector.
    const providers: StaticProvider[] = [
      { provide: this._dialogDataToken, useValue: config.data },
      { provide: this._dialogRefConstructor, useValue: dialogRef },
    ];

    return Injector.create({ parent: userInjector || this._injector, providers });
  }

  /**
   * Removes a dialog from the array of open dialogs.
   * @param dialogRef Dialog to be removed.
   */
  private _removeOpenDialog(dialogRef: NativeDialogRef<any>) {
    const index = this.openDialogs.indexOf(dialogRef);

    if (index > -1) {
      this.openDialogs.splice(index, 1);
      this._openDialogMetadata.delete(dialogRef);

      // If all the dialogs were closed, remove/restore the `aria-hidden`
      // to a the siblings and emit to the `afterAllClosed` stream.
      if (!this.openDialogs.length) {
        this._getAfterAllClosed().next();
      }
    }
  }

  /** Closes all of the dialogs in an array. */
  private _closeDialogs(dialogs: NativeDialogRef<any>[]) {
    let i = dialogs.length;

    while (i--) {
      // The `_openDialogs` property isn't updated after close until the rxjs subscription
      // runs on the next microtask, in addition to modifying the array as we're going
      // through it. We loop through all of them and call close without assuming that
      // they'll be removed from the list instantaneously.
      dialogs[i].close();
    }
  }
}

/**
 * Applies default options to the dialog config.
 * @param config Config to be modified.
 * @param defaultOptions Default options provided.
 * @returns The new configuration object.
 */
function _applyConfigDefaults(config?: NativeDialogConfig, defaultOptions?: NativeDialogConfig): NativeDialogConfig {
  return { ...defaultOptions, ...config };
}

/**
 * Register `NativeDialog` with the application's HMR eager-instantiate
 * registry so the post-bootstrap pipeline forces an `injector.get()` on
 * the service in the same JS task as the bootstrap event. Without this,
 * `NativeDialog` is only constructed when something in user-app code
 * injects it (typically a wrapper service that opens modals). When that
 * injection happens lazily — on first user-driven modal open — captured
 * dialogs from a prior HMR cycle wait until the user reopens *something*
 * before the new realm even sees the stash. Eager instantiation makes
 * the restore work happen as early as possible during a hot reload while
 * staying gated to dev mode + HMR-active environments.
 *
 * Registered after the class declaration so the closure references the
 * fully-defined class rather than tripping the temporal dead zone.
 *
 * Idempotent: the registry de-dupes function references, so multiple
 * evaluations of this module across HMR cycles never accumulate stale
 * registrations.
 */
if (isAngularHmrEnabled()) {
  const added = registerHmrEagerInstantiator((injector: Injector) => {
    try {
      const inst = injector.get(NativeDialog, null);
      hmrDialogDiag(`eager-instantiator fired NativeDialog=${inst ? `instance#${(inst as unknown as { _diagInstanceId?: number })._diagInstanceId}` : 'null'}`);
    } catch (err) {
      hmrDialogDiag(`eager-instantiator threw: ${(err as Error)?.message ?? err}`);
      // Some user-app providers may not include `NativeDialog` (e.g. a
      // module that doesn't depend on the dialog feature). The registry
      // contract is "best effort": failing to find the token must be a
      // silent no-op so unrelated apps aren't penalized.
    }
  });
  hmrDialogDiag(`registerHmrEagerInstantiator added=${added} (false means already present in registry)`);
}

export {
  /**
   * @deprecated Use `NativeDialog` instead.
   */
  NativeDialog as NativeDialogService,
};
