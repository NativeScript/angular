import { Component, ElementRef } from '@angular/core';
import { Frame } from '@nativescript/core';
import { frameMeta, registerElement } from '../../element-registry';

export function customFrameComponentFactory(v: FramePageComponent) {
  return v.element.nativeElement;
}

registerElement('FramePage', () => Frame, frameMeta);
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
