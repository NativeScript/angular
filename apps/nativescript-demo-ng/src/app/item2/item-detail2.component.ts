import { Component, OnInit, OnDestroy, NO_ERRORS_SCHEMA, inject } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { NativeScriptCommonModule, RouterExtensions } from '@nativescript/angular';

import { Item } from '../item/item';
import { ItemService } from '../item/item.service';

@Component({
  selector: 'ns-details2',
  templateUrl: './item-detail2.component.html',
  imports: [NativeScriptCommonModule],
  schemas: [NO_ERRORS_SCHEMA],
})
export class ItemDetailComponent implements OnInit, OnDestroy {
  private itemService = inject(ItemService);
  private route = inject(ActivatedRoute);
  private router = inject(RouterExtensions);
  item: Item;

  constructor() {
    console.log('ItemDetail2Component construct');
  }

  ngOnInit(): void {
    const id = +this.route.snapshot.params.id;
    this.item = this.itemService.getItem(id);
  }

  goBack() {
    if (this.router.canGoBackToPreviousPage()) {
      this.router.backToPreviousPage();
    } else if (this.router.canGoBack()) {
      this.router.back();
    }
  }

  ngOnDestroy() {
    console.log('ItemDetail2Component ngOnDestroy');
  }
}
