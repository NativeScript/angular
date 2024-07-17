/* eslint-disable @angular-eslint/component-selector */
import { Component, Inject } from '@angular/core';
import { IDevice, platformNames } from '@nativescript/core';
import { DEVICE } from '../../tokens';

@Component({
  selector: 'android',
  template: `@if (show) { 
    <ng-content></ng-content>
  }`,
  standalone: true,
})
export class AndroidFilterComponent {
  public show: boolean;

  constructor(@Inject(DEVICE) device: IDevice) {
    this.show = device.os === platformNames.android;
  }
}
