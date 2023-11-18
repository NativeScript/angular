/* eslint-disable @angular-eslint/component-selector */
import { NgIf } from '@angular/common';
import { Component, Inject } from '@angular/core';
import { IDevice, platformNames } from '@nativescript/core';
import { DEVICE } from '../../tokens';

@Component({
  selector: 'ios',
  template: `<ng-content *ngIf="show"></ng-content>`,
  standalone: true,
  imports: [NgIf],
})
export class IOSFilterComponent {
  public show: boolean;
  constructor(@Inject(DEVICE) device: IDevice) {
    this.show = device.os === platformNames.ios;
  }
}
