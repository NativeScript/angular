import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { RouterExtensions } from '@nativescript/angular';

import { Item } from '../item/item';
import { ItemService } from '../item/item.service';

@Component({
  selector: 'ns-details2',
  moduleId: module.id,
  templateUrl: './item-detail2.component.html',
})
export class ItemDetailComponent implements OnInit {
  item: Item;

  constructor(private itemService: ItemService, private route: ActivatedRoute, private router: RouterExtensions) {
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
