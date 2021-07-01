/* eslint-disable @angular-eslint/component-selector */
import { Component, Inject } from '@angular/core';
import { platformNames, IDevice } from '@nativescript/core';
import { DEVICE } from '../../tokens';

@Component({
  selector: 'ios',
  template: `<ng-content *ngIf="show"></ng-content>`,
})
export class IOSFilterComponent {
  public show: boolean;
  constructor(@Inject(DEVICE) device: IDevice) {
    this.show = device.os === platformNames.ios;
  }
}
