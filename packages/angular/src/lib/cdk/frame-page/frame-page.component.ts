import { Component, ElementRef } from '@angular/core';
import { Frame } from '@nativescript/core';

export function customFrameComponentFactory(v: FramePageComponent) {
  return v.element.nativeElement;
}

@Component({
  // eslint-disable-next-line @angular-eslint/component-selector
  selector: 'FramePage',
  template: `<Page><ng-content></ng-content></Page>`,
  providers: [
    {
      provide: Frame,
      useFactory: customFrameComponentFactory,
      deps: [FramePageComponent],
    },
  ],
})
export class FramePageComponent {
  constructor(public element: ElementRef<Frame>) {}
}
