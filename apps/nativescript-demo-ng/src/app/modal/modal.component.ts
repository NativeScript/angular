import { Component, Inject, Optional } from '@angular/core';
import { NSDialogRef } from '@nativescript/angular';

@Component({
  template: `<Label [nsDialogClose]="'thanks for clicking modal ' + id" text="in modal"></Label>`,
})
export class ModalComponent {
  id = Math.floor(Math.random() * 1000);

  constructor(@Optional() ref: NSDialogRef<ModalComponent>) {}
  ngOnInit() {
    console.log('modal init');
  }

  ngOnDestroy() {
    console.log('modal destroy');
  }
}
