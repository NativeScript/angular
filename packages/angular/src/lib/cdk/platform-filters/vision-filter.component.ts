/* eslint-disable @angular-eslint/component-selector */
import { Component, Inject } from '@angular/core';
import { platformNames, IDevice } from '@nativescript/core';
import { DEVICE } from '../../tokens';

@Component({
  selector: 'visionos',
  template: `<ng-content *ngIf="show"></ng-content>`,
})
export class VisionOSFilterComponent {
  public show: boolean;

  constructor(@Inject(DEVICE) device: IDevice) {
    // Note: casting any to be backwards compatible
    // Available in 8.6+ only
    this.show = device.os === (platformNames as any).visionos;
  }
}
