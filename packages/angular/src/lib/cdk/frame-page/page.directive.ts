import { Directive, ElementRef } from '@angular/core';
import { Page } from '@nativescript/core';
import { PageService } from './page.service';

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
    PageService,
  ],
})
export class PageDirective {
  constructor(public element: ElementRef<Page>) {}
}
