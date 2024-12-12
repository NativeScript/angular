// make sure you import mocha-config before @angular/core
import { ChangeDetectionStrategy, Component, Directive, NgModule, NO_ERRORS_SCHEMA, ViewChild } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { DetachedLoader, NativeScriptModule } from '@nativescript/angular';
import { NativeScriptTestingModule } from '@nativescript/angular/testing';
// import { NS_COMPILER_PROVIDERS } from "@nativescript/angular/platform";
import { CommonModule } from '@angular/common';

@Component({
  template: `<StackLayout><Label text="COMPONENT"></Label></StackLayout>`,
  schemas: [NO_ERRORS_SCHEMA],
})
export class TestComponent {}

@Directive()
class LoaderComponentBase {
  @ViewChild(DetachedLoader, { static: false }) public loader: DetachedLoader;
}

@Component({
  selector: 'loader-component',
  template: `
    <StackLayout>
      <DetachedContainer #loader></DetachedContainer>
    </StackLayout>
  `,
  imports: [DetachedLoader],
  schemas: [NO_ERRORS_SCHEMA],
})
export class LoaderComponent extends LoaderComponentBase {}

@Component({
  selector: 'loader-component-on-push',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <StackLayout>
      <DetachedContainer #loader></DetachedContainer>
    </StackLayout>
  `,
  imports: [DetachedLoader],
  schemas: [NO_ERRORS_SCHEMA],
})
// eslint-disable-next-line @angular-eslint/component-class-suffix
export class LoaderComponentOnPush extends LoaderComponentBase {}

@NgModule({
  imports: [LoaderComponent, LoaderComponentOnPush, TestComponent],
  schemas: [NO_ERRORS_SCHEMA],
})
export class EntryComponentsTestModule {}
describe('DetachedLoader', function () {
  // this.timeout(4000);
  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [NativeScriptModule, NativeScriptTestingModule, CommonModule, LoaderComponent, LoaderComponentOnPush, TestComponent],
      schemas: [NO_ERRORS_SCHEMA],
    });
    return TestBed.compileComponents();
  });

  it('creates component', () => {
    const loader = TestBed.createComponent(LoaderComponent);
    loader.detectChanges();
    const compRef = loader.componentInstance.loader.loadComponentSync(TestComponent);
    expect(compRef).toBeTruthy();
    // return nsTestBedRender(LoaderComponent).then((fixture) => {
    //     const component: LoaderComponent = fixture.componentRef.instance;
    //     return component.loader.loadComponent(TestComponent);
    // });
  });

  it('creates component when ChangeDetectionStrategy is OnPush', function () {
    const loader = TestBed.createComponent(LoaderComponentOnPush);
    loader.detectChanges();
    const compRef = loader.componentInstance.loader.loadComponentSync(TestComponent);
    expect(compRef).toBeTruthy();
    // return nsTestBedRender(LoaderComponentOnPush).then((fixture) => {
    //     const component: LoaderComponentOnPush = fixture.componentRef.instance;
    //     return component.loader.loadComponent(TestComponent);
    // });
  });
});
