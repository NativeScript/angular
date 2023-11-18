/* eslint-disable @angular-eslint/component-selector */
import { NgIf } from '@angular/common';
import { Component, Inject } from '@angular/core';
import { IDevice, platformNames } from '@nativescript/core';
import { DEVICE } from '../../tokens';

@Component({
  selector: 'android',
  template: `<ng-content *ngIf="show"></ng-content>`,
  standalone: true,
  imports: [NgIf],
})
export class AndroidFilterComponent {
  public show: boolean;

  constructor(@Inject(DEVICE) device: IDevice) {
    this.show = device.os === platformNames.android;
  }
}
