/* eslint-disable @angular-eslint/component-selector */
import { Component, Inject } from '@angular/core';
import { platformNames, IDevice } from '@nativescript/core';
import { DEVICE } from '../../tokens';

@Component({
  selector: 'android',
  template: `<ng-content *ngIf="show"></ng-content>`,
})
export class AndroidFilterComponent {
  public show: boolean;

  constructor(@Inject(DEVICE) device: IDevice) {
    this.show = device.os === platformNames.android;
  }
}
