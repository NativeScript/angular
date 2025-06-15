import { Component, OnInit, OnDestroy, NO_ERRORS_SCHEMA, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';

import { Item } from '../item/item';
import { ItemService } from '../item/item.service';
import { ModalComponent } from '../modal/modal.component';
import {
  ModalDialogService,
  NativeDialogService,
  NativeScriptCommonModule,
  NativeScriptRouterModule,
} from '@nativescript/angular';

@Component({
  selector: 'ns-items',
  templateUrl: './items.component.html',
  imports: [NativeScriptCommonModule, NativeScriptRouterModule],
  schemas: [NO_ERRORS_SCHEMA],
})
export class ItemsComponent implements OnInit, OnDestroy {
  private itemService = inject(ItemService);
  private nativeDialog = inject(NativeDialogService);
  private modalDialog = inject(ModalDialogService);
  private http = inject(HttpClient);
  message = 'Hello Angular 20.0.0';
  items: Array<Item>;
  borderRadius: number;
  fontSize: number;

  constructor() {
    if (global.isAndroid) {
      this.borderRadius = 25;
      this.fontSize = 15;
    } else {
      this.borderRadius = 25;
      this.fontSize = 18;
    }
  }

  ngOnInit(): void {
    console.log('ItemsComponent ngOnInit');
    this.items = this.itemService.getItems();

    // setTimeout(() => {
    //   this.modalDialog.showModal(ModalComponent, {});
    //   // this.show1 = false;
    // }, 1000);
  }

  openModal() {
    const ref = this.nativeDialog.open(ModalComponent, {
      nativeOptions: {
        fullscreen: !!global.isAndroid,
      },
    });
    ref.afterOpened().subscribe(() => console.log('after openend'));
    ref.beforeClosed().subscribe((result) => console.log('beforeClosed', result));
    ref.afterClosed().subscribe((result) => console.log('afterClosed', result));
    // setTimeout(() => ref.close('result!'), 1000);
  }

  fetchTodos() {
    this.http.get(`https://jsonplaceholder.typicode.com/todos/1`).subscribe((res) => {
      console.log('Http get:', res);
    });
  }

  ngOnDestroy() {
    console.log('Items3Component ngOnDestroy');
  }
}
