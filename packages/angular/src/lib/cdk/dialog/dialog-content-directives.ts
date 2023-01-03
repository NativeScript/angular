/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import { Directive, Input, OnChanges, OnInit, Optional, SimpleChanges, ElementRef, HostListener } from '@angular/core';
import { View, ViewBase } from '@nativescript/core';
import { NativeDialogService } from './dialog-services';
import { NativeDialogRef } from './dialog-ref';

/**
 * Button that will close the current dialog.
 */
@Directive({
  // eslint-disable-next-line @angular-eslint/directive-selector
  selector: '[native-dialog-close], [nativeDialogClose]',
  exportAs: 'nativeDialogClose',
})
export class NativeDialogCloseDirective implements OnInit, OnChanges {
  /** Dialog close input. */
  @Input('native-dialog-close') dialogResult: any;

  @Input('nativeDialogClose') _matDialogClose: any;

  constructor(
    // The dialog title directive is always used in combination with a `MatDialogRef`.
    // tslint:disable-next-line: lightweight-tokens
    @Optional() public dialogRef: NativeDialogRef<any>,
    private _elementRef: ElementRef<View>,
    private _dialog: NativeDialogService
  ) {}

  ngOnInit() {
    if (!this.dialogRef) {
      // When this directive is included in a dialog via TemplateRef (rather than being
      // in a Component), the DialogRef isn't available via injection because embedded
      // views cannot be given a custom injector. Instead, we look up the DialogRef by
      // ID. This must occur in `onInit`, as the ID binding for the dialog container won't
      // be resolved at constructor time.
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      this.dialogRef = getClosestDialog(this._elementRef, this._dialog.openDialogs)!;
    }
  }

  ngOnChanges(changes: SimpleChanges) {
    const proxiedChange = changes['_matDialogClose'] || changes['_matDialogCloseResult'];

    if (proxiedChange) {
      this.dialogResult = proxiedChange.currentValue;
    }
  }

  @HostListener('tap')
  _onButtonClick() {
    // Determinate the focus origin using the click event, because using the FocusMonitor will
    // result in incorrect origins. Most of the time, close buttons will be auto focused in the
    // dialog, and therefore clicking the button won't result in a focus change. This means that
    // the FocusMonitor won't detect any origin change, and will always output `program`.
    this.dialogRef.close(this.dialogResult);
  }
}

/**
 * Finds the closest MatDialogRef to an element by looking at the DOM.
 * @param element Element relative to which to look for a dialog.
 * @param openDialogs References to the currently-open dialogs.
 */
function getClosestDialog(element: ElementRef<View>, openDialogs: NativeDialogRef<any>[]) {
  let view: ViewBase | null = element.nativeElement.parent;

  while (view && !Object.hasOwnProperty.call(view, '__ng_modal_id__')) {
    view = view.parent;
  }

  return view ? openDialogs.find((dialog) => dialog.id === view['__ng_modal_id__']) : null;
}
