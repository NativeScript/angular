import { Component, OnDestroy, OnInit, Optional, ViewContainerRef, inject } from '@angular/core';
import { ModalDialogService, NativeDialogRef, NativeDialogService } from '@nativescript/angular';
import { ItemService } from '../item/item.service';

@Component({
  selector: 'ns-modal',
  templateUrl: `./modal.component.html`,
})
export class ModalComponent implements OnInit, OnDestroy {
  id = Math.floor(Math.random() * 1000);
  itemService = inject(ItemService);
  logo: string;
  color: string;

  constructor(
    @Optional() private ref: NativeDialogRef<ModalComponent>,
    private nativeDialog: NativeDialogService,
    private modalDialog: ModalDialogService,
    private vcRef: ViewContainerRef,
  ) {
    this.logo = this.itemService.flavors[this.itemService.currentFlavor].logo;
    this.color = this.itemService.flavors[this.itemService.currentFlavor].color;
  }

  openNewModal() {
    this.itemService.currentFlavor++;
    const ref = this.nativeDialog.open(ModalComponent, {
      nativeOptions: {
        fullscreen: !!global.isAndroid,
      },
    });
    ref.afterClosed().subscribe(() => {
      this.itemService.currentFlavor--;
    });
  }
  ngOnInit() {
    console.log('modal init');
  }

  ngOnDestroy() {
    console.log('modal destroy');
  }
}
