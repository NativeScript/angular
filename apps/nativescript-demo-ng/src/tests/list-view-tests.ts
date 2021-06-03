import { Component, Input, NgModule, NO_ERRORS_SCHEMA, ViewChild } from '@angular/core';
import { TestBed, waitForAsync } from '@angular/core/testing';
import { ListViewComponent, NativeScriptModule } from '@nativescript/angular';
import { promiseWait } from '@nativescript/angular/testing';
// import trace = require("trace");
// trace.setCategories("ns-list-view, " + trace.categories.Navigation);
// trace.enable();

class DataItem {
  constructor(public id: number, public name: string) {}
}

const ITEMS = [new DataItem(0, 'data item 0'), new DataItem(1, 'data item 1'), new DataItem(2, 'data item 2')];

let testTemplates: { first: number; second: number };

@Component({
  selector: 'list-view-setupItemView',
  template: `
    <GridLayout>
      <ListView [items]="myItems" (setupItemView)="onSetupItemView($event)">
        <ng-template let-item="item">
          <Label [text]="'[' + item.id + '] ' + item.name"></Label>
        </ng-template>
      </ListView>
    </GridLayout>
  `,
})
export class TestListViewComponent {
  public myItems: Array<DataItem> = ITEMS;
  public counter: number = 0;
  onSetupItemView(args) {
    this.counter++;
  }
}

@Component({
  selector: 'item-component',
  template: `<Label text="template"></Label>`,
})
export class ItemTemplateComponent {
  @Input() set templateName(value: any) {
    if (value === 'first') {
      testTemplates.first = testTemplates.first + 1;
    } else if (value === 'second') {
      testTemplates.second = testTemplates.second + 1;
    } else {
      throw new Error('Unexpected templateName: ' + value);
    }
  }
}

@Component({
  selector: 'list-with-template-selector',
  template: `
    <GridLayout>
      <ListView [items]="myItems" [itemTemplateSelector]="templateSelector">
        <ng-template nsTemplateKey="first">
          <item-component templateName="first"></item-component>
        </ng-template>
        <ng-template nsTemplateKey="second" let-item="item">
          <item-component templateName="second"></item-component>
        </ng-template>
      </ListView>
    </GridLayout>
  `,
})
export class TestListViewSelectorComponent {
  public myItems: Array<DataItem> = ITEMS;
  public templateSelector = (item: DataItem, index: number, items: any) => {
    return item.id % 2 === 0 ? 'first' : 'second';
  };
  constructor() {
    testTemplates = { first: 0, second: 0 };
  }
}

@Component({
  selector: 'list-view-default-item-template',
  template: `
    <GridLayout>
      <ListView #listView [items]="myItems"></ListView>
    </GridLayout>
  `,
})
export class TestDefaultItemTemplateComponent {
  public myItems: Array<DataItem>;
  constructor() {
    this.myItems = new Array<DataItem>();
    for (let i = 0; i < 100; i++) {
      this.myItems.push(new DataItem(i, 'Name ' + i));
    }
  }
  @ViewChild('listView', { static: false }) listViewElement: ListViewComponent;
  onScrollListViewTo() {
    this.listViewElement.nativeElement.scrollToIndex(100);
  }
}

@NgModule({
  declarations: [TestListViewComponent, TestListViewSelectorComponent, ItemTemplateComponent, TestDefaultItemTemplateComponent],
  imports: [NativeScriptModule],
  schemas: [NO_ERRORS_SCHEMA],
})
export class ListViewModule {}

describe('ListView-tests', () => {
  beforeEach(() =>
    TestBed.configureTestingModule({
      declarations: [TestListViewComponent, TestListViewSelectorComponent, ItemTemplateComponent, TestDefaultItemTemplateComponent],
      imports: [NativeScriptModule],
      schemas: [NO_ERRORS_SCHEMA],
    }).compileComponents()
  );

  it(
    'setupItemView is called for every item',
    waitForAsync(async () => {
      const fixture = TestBed.createComponent(TestListViewComponent);
      fixture.detectChanges();
      const component = fixture.componentRef.instance;
      await fixture.whenRenderingDone();
      expect(component.counter).toBe(3);
    })
  );

  it(
    'itemTemplateSelector selects templates',
    waitForAsync(async () => {
      const fixture = TestBed.createComponent(TestListViewSelectorComponent);
      fixture.detectChanges();
      await fixture.whenRenderingDone();
      expect(testTemplates).toEqual({ first: 2, second: 1 });
    })
  );

  it(
    "'defaultTemplate' does not throw when list-view is scrolled",
    waitForAsync(async () => {
      const fixture = TestBed.createComponent(TestDefaultItemTemplateComponent);
      fixture.detectChanges();
      const component = fixture.componentRef.instance;
      await fixture.whenRenderingDone();
      expect(component.onScrollListViewTo.bind(component)).not.toThrow();
    })
  );
});
