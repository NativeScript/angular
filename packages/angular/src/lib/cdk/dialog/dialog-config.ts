/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import { ViewContainerRef, ComponentFactoryResolver } from '@angular/core';
import { ShowModalOptions } from '@nativescript/core';

export type NativeShowModalOptions = Partial<Omit<ShowModalOptions, 'cancelable' | 'closeCallback'>>;
/**
 * Configuration for opening a modal dialog with the MatDialog service.
 */
export class NativeDialogConfig<D = any> {
  /**
   * Where the attached component should live in Angular's *logical* component tree.
   * This affects what is available for injection and the change detection order for the
   * component instantiated inside of the dialog. This does not affect where the dialog
   * content will be rendered.
   */
  viewContainerRef?: ViewContainerRef;

  /** ID for the dialog. If omitted, a unique one will be generated. */
  id?: string;

  /** Whether the dialog has a backdrop. */
  hasBackdrop?: boolean = true;

  /** Whether the user can use escape or clicking on the backdrop to close the modal. */
  disableClose?: boolean = false;

  /** Data being injected into the child component. */
  data?: D | null = null;

  /**
   * Whether the dialog should close when the user goes backwards/forwards in history.
   * Note that this usually doesn't include clicking on links (unless the user is using
   * the `HashLocationStrategy`).
   */
  closeOnNavigation?: boolean = true;

  /** Alternate `ComponentFactoryResolver` to use when resolving the associated component. */
  componentFactoryResolver?: ComponentFactoryResolver;

  nativeOptions?: NativeShowModalOptions = {};

  // TODO(jelbourn): add configuration for lifecycle hooks, ARIA labelling.
}
