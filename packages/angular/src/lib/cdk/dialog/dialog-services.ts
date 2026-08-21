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
import { getFreshComponentClass, isAngularHmrEnabled, registerHmrEagerInstantiator } from '../../hmr';
import { NSLocationStrategy } from '../../legacy/router/ns-location-strategy';
import { NativeScriptDebug } from '../../trace';
import { ComponentType } from '../../utils/general';
import { ComponentPortal, TemplatePortal } from '../portal/common';
import { NativeDialogConfig } from './dialog-config';
import {
  abortCapturedDialog,
  buildNonAnimatedRestoreConfig,
  captureDialogsForHmr,
  CapturedHmrDialog,
  consumePendingHmrDialogs,
  HmrCandidateDialog,
  peekPendingHmrDialogs,
  suppressNativeCloseAnimation,
} from './dialog-hmr';
import { NativeDialogRef } from './dialog-ref';
import { NativeModalRef } from './native-modal-ref';

function hmrDialogLog(message: string): void {
  if (!isAngularHmrEnabled() || !NativeScriptDebug.isLogEnabled()) {
    return;
  }
  NativeScriptDebug.hmrLog(`[dialog] ${message}`);
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
  private _openDialogsAtThisLevel: NativeDialogRef<any>[] = [];
  private readonly _afterAllClosedAtThisLevel = new Subject<void>();
  private readonly _afterOpenedAtThisLevel = new Subject<NativeDialogRef<any>>();
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
    // Only close the dialogs at this level on destroy
    // since the parent service may still be active.
    this._closeDialogs(this._openDialogsAtThisLevel);
    this._afterAllClosedAtThisLevel.complete();
    this._afterOpenedAtThisLevel.complete();
    for (const sub of this._hmrSubscriptions) {
      try {
        sub.unsubscribe();
      } catch {
        // ignore
      }
    }
    this._hmrSubscriptions = [];
  }

  private _restoreScheduledForThisInstance = false;

  private _initHmrLifecycle(): null {
    if (this._parentDialog || !isAngularHmrEnabled()) {
      return null;
    }

    const dispose = preAngularDisposal$.subscribe((event) => {
      if (event.moduleType !== 'main' || event.reason !== 'hotreload') {
        return;
      }
      this._captureOpenDialogsForHmr();
    });

    const bootstrap = postAngularBootstrap$.subscribe((event) => {
      if (event.moduleType !== 'main' || event.reason !== 'hotreload') {
        return;
      }
      this._maybeScheduleRestore(`postAngularBootstrap$ (reason=${event.reason})`);
    });

    this._hmrSubscriptions.push(dispose, bootstrap);

    const pendingNow = peekPendingHmrDialogs();
    if (pendingNow.length > 0) {
      this._maybeScheduleRestore(`stash peek on ctor: ${pendingNow.length} pending dialog(s)`);
    }
    return null;
  }

  private _maybeScheduleRestore(triggerDescription: string): void {
    if (this._restoreScheduledForThisInstance) {
      return;
    }
    this._restoreScheduledForThisInstance = true;
    hmrDialogLog(`scheduling restore (trigger=${triggerDescription})`);
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

    const captured = captureDialogsForHmr(candidates);

    if (captured.length > 0) {
      for (const candidate of candidates) {
        suppressNativeCloseAnimation(candidate);
      }
      hmrDialogLog(`captured ${captured.length} dialog(s) for HMR restore [${captured.map((c) => c.componentName).join(', ')}]`);
    } else if (this._openDialogsAtThisLevel.length > 0) {
      hmrDialogLog(`skipped capture: ${this._openDialogsAtThisLevel.length} open dialog(s) but none preservable`);
    }
  }

  private async _restorePendingDialogs(): Promise<void> {
    const pending = consumePendingHmrDialogs();
    if (pending.length === 0) {
      return;
    }

    hmrDialogLog(`restoring ${pending.length} dialog(s) after reboot [${pending.map((c) => c.componentName).join(', ')}]`);

    for (const captured of pending) {
      this._restoreSingleDialog(captured);
    }
  }

  private _restoreSingleDialog(captured: CapturedHmrDialog): void {
    const live = getFreshComponentClass<ComponentType<unknown>>(captured.componentName);
    const componentClass = live ?? captured.componentClass;
    const usingFresh = !!live && live !== captured.componentClass;
    this._scheduleRestoreOpenWhenReady(captured, componentClass, usingFresh);
  }

  private static readonly _ROOT_VIEW_LOADED_TIMEOUT_MS = 1_000;

  private _scheduleRestoreOpenWhenReady(
    captured: CapturedHmrDialog,
    componentClass: ComponentType<unknown>,
    usingFresh: boolean,
  ): void {
    const rootView = Application.getRootView();

    if (rootView && rootView.isLoaded) {
      // Yield so the incoming root view can attach first.
      setTimeout(() => this._performRestoreOpen(captured, componentClass, usingFresh), 0);
      return;
    }

    if (!rootView) {
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
        // ignore
      }
      // viewWillAppear runs before the view is in a window.
      setTimeout(() => this._performRestoreOpen(captured, componentClass, usingFresh), 0);
    };

    try {
      rootView.once(View.loadedEvent, onLoaded);
    } catch {
      setTimeout(() => onLoaded(), 50);
    }

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
    if (usingFresh) {
      hmrDialogLog(`restore ${captured.componentName} usingFreshClass=true`);
    }

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
      NativeScriptDebug.hmrLogError(`HMR modal restore failed: ${message}`);
    }
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
      const injector = this._createInjector<T>(config, dialogRef);
      nativeModalRef.attachTemplatePortal(
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        new TemplatePortal<T>(componentOrTemplateRef, null!, <any>{ $implicit: config.data, dialogRef }, injector),
      );
    } else {
      const injector = this._createInjector<T>(config, dialogRef);
      const contentRef = nativeModalRef.attachComponentPortal<T>(
        new ComponentPortal(componentOrTemplateRef, config.viewContainerRef, injector, null, config.bindings),
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
    const userInjector = config && (config.injector || (config.viewContainerRef && config.viewContainerRef.injector));

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

if (isAngularHmrEnabled()) {
  registerHmrEagerInstantiator((injector: Injector) => {
    try {
      injector.get(NativeDialog, null);
    } catch {
      // ignore
    }
  });
}

export {
  /**
   * @deprecated Use `NativeDialog` instead.
   */
  NativeDialog as NativeDialogService,
};
