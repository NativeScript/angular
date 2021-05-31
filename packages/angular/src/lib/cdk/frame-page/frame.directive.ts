import { Directive, ElementRef } from '@angular/core';
import { Frame } from '@nativescript/core';

export function customFrameDirectiveFactory(v: FrameDirective) {
  return v.element.nativeElement;
}

@Directive({
  // eslint-disable-next-line @angular-eslint/directive-selector
  selector: 'Frame',
  providers: [
    {
      provide: Frame,
      useFactory: customFrameDirectiveFactory,
      deps: [FrameDirective],
    },
  ],
})
export class FrameDirective {
  constructor(public element: ElementRef<Frame>) {}
}
