/* eslint-disable @angular-eslint/component-selector */
import { Component } from '@angular/core';

@Component({
  selector: 'apple',
  template: `@if (show) { 
    <ng-content></ng-content>
  }`,
  standalone: true,
})
export class AppleFilterComponent {
  public show = __APPLE__;
}
