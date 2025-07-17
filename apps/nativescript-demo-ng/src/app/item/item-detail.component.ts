import { Component, inject, NO_ERRORS_SCHEMA, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';

import { Item } from './item';
import { ItemService } from './item.service';
import { NativeScriptCommonModule } from '@nativescript/angular';

@Component({
  selector: 'ns-details',
  templateUrl: './item-detail.component.html',
  imports: [NativeScriptCommonModule],
  schemas: [NO_ERRORS_SCHEMA],
})
export class ItemDetailComponent implements OnInit {
  item: Item;
  private itemService = inject(ItemService);
  private route = inject(ActivatedRoute);

  ngOnInit(): void {
    const id = +this.route.snapshot.params.id;
    this.item = this.itemService.getItem(id);
  }
}
