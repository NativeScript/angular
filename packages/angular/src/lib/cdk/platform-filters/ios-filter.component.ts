/* eslint-disable @angular-eslint/component-selector */
import { Component, Inject } from '@angular/core';
import { IDevice, platformNames } from '@nativescript/core';
import { DEVICE } from '../../tokens';

@Component({
  selector: 'ios',
  template: `@if (show) { 
    <ng-content></ng-content>
  }`,
  standalone: true,
})
export class IOSFilterComponent {
  public show: boolean;
  constructor(@Inject(DEVICE) device: IDevice) {
    this.show = device.os === platformNames.ios;
  }
}
