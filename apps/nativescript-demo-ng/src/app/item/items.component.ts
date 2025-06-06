import { Component, OnInit, OnDestroy, NO_ERRORS_SCHEMA } from '@angular/core';
import { HttpClient } from '@angular/common/http';

import { Item } from './item';
import { ItemService } from './item.service';
import { ModalComponent } from '../modal/modal.component';
import { ModalDialogService, NativeDialogService, NativeScriptCommonModule } from '@nativescript/angular';

@Component({
  selector: 'ns-items',
  moduleId: module.id,
  templateUrl: './items.component.html',
  imports: [NativeScriptCommonModule],
  standalone: true,
  schemas: [NO_ERRORS_SCHEMA],
})
export class ItemsComponent implements OnInit, OnDestroy {
  message = 'Hello Angular 20.0.0!';
  items: Array<Item>;

  constructor(
    private itemService: ItemService,
    private nativeDialog: NativeDialogService,
    private modalDialog: ModalDialogService,
    private http: HttpClient,
  ) {}

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

  fetchTodos() {
    this.http.get(`https://jsonplaceholder.typicode.com/todos/1`).subscribe((res) => {
      console.log('Http get:', res);
    });
  }

  ngOnDestroy() {
    console.log('ItemsComponent ngOnDestroy');
  }
}
