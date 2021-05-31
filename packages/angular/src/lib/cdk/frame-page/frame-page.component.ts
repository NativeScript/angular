import { AfterViewInit, Component, ElementRef, Input, OnChanges, SimpleChanges, ViewChild } from '@angular/core';
import { Frame } from '@nativescript/core';
import { frameMeta, registerElement } from '../../element-registry';
import { PageDirective } from './page.directive';

export function customFrameComponentFactory(v: FramePageComponent) {
  return v.element.nativeElement;
}

registerElement('FramePage', () => Frame, frameMeta);
@Component({
  // eslint-disable-next-line @angular-eslint/component-selector
  selector: 'FramePage',
  template: `<Page #page><ng-content></ng-content></Page>`,
  providers: [
    {
      provide: Frame,
      useFactory: customFrameComponentFactory,
      deps: [FramePageComponent],
    },
  ],
})
export class FramePageComponent implements AfterViewInit, OnChanges {
  @ViewChild(PageDirective) page: PageDirective;

  @Input() actionBarHidden = false;

  constructor(public element: ElementRef<Frame>) {}

  ngOnChanges(changes: SimpleChanges): void {
    if (changes.actionBarHidden) {
      if (this.page?.element.nativeElement) {
        this.page.element.nativeElement.actionBarHidden = !!this.actionBarHidden;
      }
    }
  }
  ngAfterViewInit(): void {
    if (this.page?.element.nativeElement) {
      this.page.element.nativeElement.actionBarHidden = !!this.actionBarHidden;
    }
  }
}
