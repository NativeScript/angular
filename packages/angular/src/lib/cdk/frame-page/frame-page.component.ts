import { AfterViewInit, Component, ElementRef, Input, OnChanges, Renderer2, SimpleChanges, ViewChild } from '@angular/core';
import { Frame, Page, View } from '@nativescript/core';
import { frameMeta, registerElement } from '../../element-registry';
import { PageService } from './page.service';

export function customFrameComponentFactory(v: FramePageComponent) {
  return v.element.nativeElement;
}

export function customPageFactoryFromFrame(v: FramePageComponent) {
  return v.page;
}

registerElement('FramePage', () => Frame, {
  insertChild: (parent: Frame, child: View) => {
    if (child instanceof Page) {
      frameMeta.insertChild(parent, child);
      return;
    }
    parent['__ng_page__'].content = child;
  },
});
@Component({
  // eslint-disable-next-line @angular-eslint/component-selector
  selector: 'FramePage',
  template: `<ng-content></ng-content>`,
  providers: [
    {
      provide: Frame,
      useFactory: customFrameComponentFactory,
      deps: [FramePageComponent],
    },
    {
      provide: Page,
      useFactory: customPageFactoryFromFrame,
      deps: [FramePageComponent],
    },
    PageService,
  ],
})
export class FramePageComponent implements AfterViewInit, OnChanges {
  page: Page;

  @Input() actionBarHidden = false;

  constructor(public element: ElementRef<Frame>, renderer: Renderer2) {
    this.page = renderer.createElement('Page') as Page;
    element.nativeElement['__ng_page__'] = this.page;
    renderer.appendChild(element.nativeElement, this.page);
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes.actionBarHidden && changes.actionBarHidden.previousValue !== changes.actionBarHidden.currentValue) {
      if (this.page) {
        this.page.actionBarHidden = !!this.actionBarHidden;
      }
    }
  }
  ngAfterViewInit(): void {
    if (this.page) {
      this.page.actionBarHidden = !!this.actionBarHidden;
    }
  }
}
