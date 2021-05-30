import { Directive, ElementRef } from '@angular/core';
import { Frame } from '@nativescript/core';

export function customFrameFactory(v: FrameDirective) {
  return v.element.nativeElement;
}

@Directive({
  // eslint-disable-next-line @angular-eslint/directive-selector
  selector: 'Frame',
  providers: [
    {
      provide: Frame,
      useFactory: customFrameFactory,
      deps: [FrameDirective],
    },
  ],
})
export class FrameDirective {
  constructor(public element: ElementRef<Frame>) {}
}
