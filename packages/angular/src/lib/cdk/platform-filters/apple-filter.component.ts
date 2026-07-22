/* eslint-disable @angular-eslint/component-selector */
import { Component, ChangeDetectionStrategy } from '@angular/core';

@Component({
  selector: 'apple',
  template: `@if (show) { 
    <ng-content></ng-content>
  }`,
  changeDetection: ChangeDetectionStrategy.Eager,
  standalone: true,
})
export class AppleFilterComponent {
  public show = __APPLE__;
}
