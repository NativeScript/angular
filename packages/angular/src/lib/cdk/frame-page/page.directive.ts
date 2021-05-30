import { Directive, ElementRef } from '@angular/core';
import { Page } from '@nativescript/core';

export function customPageFactory(v: PageDirective) {
  return v.element.nativeElement;
}

@Directive({
  // eslint-disable-next-line @angular-eslint/directive-selector
  selector: 'Page',
  providers: [
    {
      provide: Page,
      useFactory: customPageFactory,
      deps: [PageDirective],
    },
  ],
})
export class PageDirective {
  constructor(public element: ElementRef<Page>) {}
}
