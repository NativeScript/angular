import { Component, Inject, OnDestroy, OnInit, Optional, ViewContainerRef } from '@angular/core';
import { ModalDialogService, NativeDialogRef, NativeDialogService } from '@nativescript/angular';

@Component({
  selector: 'ns-modal',
  templateUrl: `./modal.component.html`,
})
export class ModalComponent implements OnInit, OnDestroy {
  id = Math.floor(Math.random() * 1000);

  constructor(@Optional() private ref: NativeDialogRef<ModalComponent>, private nativeDialog: NativeDialogService, private modalDialog: ModalDialogService, private vcRef: ViewContainerRef) {}

  openNewModal() {
    this.nativeDialog.open(ModalComponent);
    // this.modalDialog.showModal(ModalComponent, {
    //   viewContainerRef: this.vcRef
    // });
  }
  ngOnInit() {
    console.log('modal init');
  }

  ngOnDestroy() {
    console.log('modal destroy');
  }
}
