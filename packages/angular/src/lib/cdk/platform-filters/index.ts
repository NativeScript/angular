/* eslint-disable @angular-eslint/component-selector */
import { Component, Inject } from '@angular/core';
import { Device, platformNames } from '@nativescript/core';
import { DEVICE } from '../../tokens';

@Component({
  selector: 'android',
  template: `<ng-content *ngIf="show"></ng-content>`,
})
export class AndroidFilterComponent {
  public show: boolean;

  constructor(@Inject(DEVICE) device: typeof Device) {
    this.show = device.os === platformNames.android;
  }
}

@Component({
  selector: 'ios',
  template: `<ng-content *ngIf="show"></ng-content>`,
})
export class IosFilterComponent {
  public show: boolean;
  constructor(@Inject(DEVICE) device: typeof Device) {
    console.log(device.os, platformNames.ios);
    this.show = device.os === platformNames.ios;
  }
}
