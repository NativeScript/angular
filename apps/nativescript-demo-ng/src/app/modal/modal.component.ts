import { Component, NO_ERRORS_SCHEMA, OnDestroy, OnInit, Optional, ViewContainerRef, inject } from '@angular/core';
import {
  ModalDialogService,
  NativeDialogModule,
  NativeDialogRef,
  NativeDialogService,
  NativeScriptCommonModule,
} from '@nativescript/angular';
import { ItemService } from '../item/item.service';
import { View } from '@nativescript/core';

@Component({
  selector: 'ns-modal',
  templateUrl: `./modal.component.html`,
  imports: [NativeScriptCommonModule, NativeDialogModule],
  schemas: [NO_ERRORS_SCHEMA],
})
export class ModalComponent implements OnInit, OnDestroy {
  private ref = inject(NativeDialogRef<ModalComponent>, { optional: true });
  private nativeDialog = inject(NativeDialogService);
  private modalDialog = inject(ModalDialogService);
  private vcRef = inject(ViewContainerRef);
  id = Math.floor(Math.random() * 1000);
  itemService = inject(ItemService);
  logo: string;
  color: string;

  constructor() {
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
