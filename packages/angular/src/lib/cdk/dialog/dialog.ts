/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import { ComponentPortal, ComponentType, NativescriptDomPortalOutlet, TemplatePortal } from '../portal';
import { Location } from '@angular/common';
import { ApplicationRef, ComponentFactoryResolver, Directive, Inject, Injectable, InjectionToken, Injector, OnDestroy, Optional, SkipSelf, StaticProvider, TemplateRef, Type } from '@angular/core';
import { defer, Observable, of as observableOf, Subject } from 'rxjs';
import { startWith } from 'rxjs/operators';
import { MatDialogConfig } from './dialog-config';
import { NSDialogRef } from './dialog-ref';
import { NativeModalRef } from './native-modal-ref';

/** Injection token that can be used to access the data that was passed in to a dialog. */
export const NS_DIALOG_DATA = new InjectionToken<any>('NSDialogData');

/** Injection token that can be used to specify default dialog options. */
export const NS_DIALOG_DEFAULT_OPTIONS = new InjectionToken<MatDialogConfig>('ns-dialog-default-options');

/**
 * Base class for dialog services. The base dialog service allows
 * for arbitrary dialog refs and dialog container components.
 */
@Directive()
export abstract class _MatDialogBase<C extends NativeModalRef> implements OnDestroy {
  private _openDialogsAtThisLevel: NSDialogRef<any>[] = [];
  private readonly _afterAllClosedAtThisLevel = new Subject<void>();
  private readonly _afterOpenedAtThisLevel = new Subject<NSDialogRef<any>>();
  private _ariaHiddenElements = new Map<Element, string | null>();
  // TODO (jelbourn): tighten the typing right-hand side of this expression.
  /**
   * Stream that emits when all open dialog have finished closing.
   * Will emit on subscribe if there are no open dialogs to begin with.
   */
  readonly afterAllClosed: Observable<void> = defer(() => (this.openDialogs.length ? this._getAfterAllClosed() : this._getAfterAllClosed().pipe(startWith<any, any>(undefined)))) as Observable<any>;

  /** Keeps track of the currently-open dialogs. */
  get openDialogs(): NSDialogRef<any>[] {
    return this._parentDialog ? this._parentDialog.openDialogs : this._openDialogsAtThisLevel;
  }

  /** Stream that emits when a dialog has been opened. */
  get afterOpened(): Subject<NSDialogRef<any>> {
    return this._parentDialog ? this._parentDialog.afterOpened : this._afterOpenedAtThisLevel;
  }

  _getAfterAllClosed(): Subject<void> {
    const parent = this._parentDialog;
    return parent ? parent._getAfterAllClosed() : this._afterAllClosedAtThisLevel;
  }

  constructor(private _injector: Injector, private _defaultOptions: MatDialogConfig | undefined, private _parentDialog: _MatDialogBase<C> | undefined, private _dialogRefConstructor: Type<NSDialogRef<any>>, private _dialogContainerType: Type<C>, private _dialogDataToken: InjectionToken<any>) {}

  /**
   * Opens a modal dialog containing the given component.
   * @param component Type of the component to load into the dialog.
   * @param config Extra configuration options.
   * @returns Reference to the newly-opened dialog.
   */
  open<T, D = any, R = any>(component: ComponentType<T>, config?: MatDialogConfig<D>): NSDialogRef<T, R>;

  /**
   * Opens a modal dialog containing the given template.
   * @param template TemplateRef to instantiate as the dialog content.
   * @param config Extra configuration options.
   * @returns Reference to the newly-opened dialog.
   */
  open<T, D = any, R = any>(template: TemplateRef<T>, config?: MatDialogConfig<D>): NSDialogRef<T, R>;

  open<T, D = any, R = any>(template: ComponentType<T> | TemplateRef<T>, config?: MatDialogConfig<D>): NSDialogRef<T, R>;

  open<T, D = any, R = any>(componentOrTemplateRef: ComponentType<T> | TemplateRef<T>, config?: MatDialogConfig<D>): NSDialogRef<T, R> {
    config = _applyConfigDefaults(config, this._defaultOptions || new MatDialogConfig());

    if (config.id && this.getDialogById(config.id) && (typeof ngDevMode === 'undefined' || ngDevMode)) {
      throw Error(`Dialog with id "${config.id}" exists already. The dialog id must be unique.`);
    }
    const dialogRef = this._attachDialogContent<T, R>(componentOrTemplateRef, config);

    this.openDialogs.push(dialogRef);
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
  getDialogById(id: string): NSDialogRef<any> | undefined {
    return this.openDialogs.find((dialog) => dialog.id === id);
  }

  ngOnDestroy() {
    // Only close the dialogs at this level on destroy
    // since the parent service may still be active.
    this._closeDialogs(this._openDialogsAtThisLevel);
    this._afterAllClosedAtThisLevel.complete();
    this._afterOpenedAtThisLevel.complete();
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
  private _attachDialogContent<T, R>(componentOrTemplateRef: ComponentType<T> | TemplateRef<T>, config: MatDialogConfig): NSDialogRef<T, R> {
    // Create a reference to the dialog we're creating in order to give the user a handle
    // to modify and close it.
    const nativeModalRef = new NativeModalRef(config, this._injector);
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
        new TemplatePortal<T>(componentOrTemplateRef, null!, <any>{ $implicit: config.data, dialogRef })
      );
    } else {
      const injector = this._createInjector<T>(config, dialogRef);
      const contentRef = nativeModalRef.attachComponentPortal<T>(new ComponentPortal(componentOrTemplateRef, config.viewContainerRef, injector));
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
  private _createInjector<T>(config: MatDialogConfig, dialogRef: NSDialogRef<T>): Injector {
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
  private _removeOpenDialog(dialogRef: NSDialogRef<any>) {
    const index = this.openDialogs.indexOf(dialogRef);

    if (index > -1) {
      this.openDialogs.splice(index, 1);

      // If all the dialogs were closed, remove/restore the `aria-hidden`
      // to a the siblings and emit to the `afterAllClosed` stream.
      if (!this.openDialogs.length) {
        this._getAfterAllClosed().next();
      }
    }
  }

  /** Closes all of the dialogs in an array. */
  private _closeDialogs(dialogs: NSDialogRef<any>[]) {
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
 * Service to open Material Design modal dialogs.
 */
@Injectable()
export class MatDialog extends _MatDialogBase<NativeModalRef> {
  constructor(injector: Injector, @Optional() @Inject(NS_DIALOG_DEFAULT_OPTIONS) defaultOptions: MatDialogConfig, @Optional() @SkipSelf() parentDialog: MatDialog) {
    super(injector, defaultOptions, parentDialog, NSDialogRef, NativeModalRef, NS_DIALOG_DATA);
  }
}

/**
 * Applies default options to the dialog config.
 * @param config Config to be modified.
 * @param defaultOptions Default options provided.
 * @returns The new configuration object.
 */
function _applyConfigDefaults(config?: MatDialogConfig, defaultOptions?: MatDialogConfig): MatDialogConfig {
  return { ...defaultOptions, ...config };
}
