import { Component, Inject, Optional } from '@angular/core';
import { NativeDialogRef } from '@nativescript/angular';

@Component({
  selector: 'ns-modal',
  templateUrl: `./modal.component.html`,
})
export class ModalComponent {
  id = Math.floor(Math.random() * 1000);

  constructor(@Optional() ref: NativeDialogRef<ModalComponent>) {}
  ngOnInit() {
    console.log('modal init');
  }

  ngOnDestroy() {
    console.log('modal destroy');
  }
}
