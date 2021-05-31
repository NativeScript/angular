import { Component, ViewContainerRef } from '@angular/core';
import { ModalDialogService, NSDialog } from '@nativescript/angular';
import { ModalComponent } from './modal/modal.component';

// registerElement('ns-app', () => GridLayout);
@Component({
  selector: 'ns-app',
  moduleId: module.id,
  templateUrl: './app.component.html',
})
export class AppComponent {
  constructor(private modalDialog: ModalDialogService, private matDialog: NSDialog, private vcRef: ViewContainerRef) {}
  ngOnInit() {
    console.log('ngOnInit');
    // setTimeout(() => {
    //   this.modalDialog.showModal(ModalComponent, {});
    //   this.show1 = false;
    // }, 1000);

    setTimeout(() => {
      const ref = this.matDialog.open(ModalComponent);
      ref.afterOpened().subscribe(() => console.log('after openend'));
      ref.beforeClosed().subscribe((result) => console.log('beforeClosed', result));
      ref.afterClosed().subscribe((result) => console.log('afterClosed', result));
      // setTimeout(() => ref.close('result!'), 1000);
    }, 1000);
  }

  ngOnDestroy() {
    console.log('ngOnDestroy');
  }
}
