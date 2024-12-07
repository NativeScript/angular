import { Component, OnDestroy, OnInit, Optional, ViewContainerRef, inject } from '@angular/core';
import { ModalDialogService, NativeDialogRef, NativeDialogService } from '@nativescript/angular';
import { ItemService } from '../item/item.service';
import { View } from '@nativescript/core';

@Component({
  selector: 'ns-modal',
  templateUrl: `./modal.component.html`,
  standalone: false,
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

  img: View;
  loadedImg(args) {
    this.img = args.object as View;
    const scaleImage = (up: boolean) => {
      this.img
        .animate({
          scale: { x: up ? 1.5 : 1.0, y: up ? 1.5 : 1.0 },
          translate: { x: up ? -100 : 0, y: 0 },
          duration: 1000,
        })
        .then(() => {
          scaleImage(up ? false : true);
        });
    };
    scaleImage(true);
  }
}
