import { Component, NO_ERRORS_SCHEMA, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';

import { Item } from './item';
import { ItemService } from './item.service';
import { NativeScriptCommonModule } from '@nativescript/angular';

@Component({
  selector: 'ns-details',
  moduleId: module.id,
  templateUrl: './item-detail.component.html',
  imports: [NativeScriptCommonModule],
  standalone: true,
  schemas: [NO_ERRORS_SCHEMA]
})
export class ItemDetailComponent implements OnInit {
  item: Item;

  constructor(
    private itemService: ItemService,
    private route: ActivatedRoute,
  ) {}

  ngOnInit(): void {
    const id = +this.route.snapshot.params.id;
    this.item = this.itemService.getItem(id);
  }
}
