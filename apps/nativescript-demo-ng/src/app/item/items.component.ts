import { Component, OnInit } from '@angular/core';

import { Item } from './item';
import { ItemService } from './item.service';
import { ModalComponent } from '../modal/modal.component';
import { ModalDialogService, NativeDialogService } from '@nativescript/angular';

@Component({
  selector: 'ns-items',
  moduleId: module.id,
  templateUrl: './items.component.html',
})
export class ItemsComponent implements OnInit {
  message = 'Hello Angular 12!';
  items: Array<Item>;

  constructor(private itemService: ItemService, private nativeDialog: NativeDialogService, private modalDialog: ModalDialogService) {}

  ngOnInit(): void {
    console.log('ItemsComponent ngOnInit');
    this.items = this.itemService.getItems();

    // setTimeout(() => {
    //   this.modalDialog.showModal(ModalComponent, {});
    //   // this.show1 = false;
    // }, 1000);
  }

  openModal() {
    const ref = this.nativeDialog.open(ModalComponent);
    ref.afterOpened().subscribe(() => console.log('after openend'));
    ref.beforeClosed().subscribe((result) => console.log('beforeClosed', result));
    ref.afterClosed().subscribe((result) => console.log('afterClosed', result));
    // setTimeout(() => ref.close('result!'), 1000);
  }

  ngOnDestroy() {
    console.log('ItemsComponent ngOnDestroy');
  }
}
