// make sure you import mocha-config before @angular/core
import { Component, NgModule, NO_ERRORS_SCHEMA, ViewContainerRef } from '@angular/core';
import { TestBed, waitForAsync } from '@angular/core/testing';
import { FrameService, ModalDialogParams, ModalDialogService, NSLocationStrategy, Outlet } from '@nativescript/angular';
import { Frame, isIOS } from '@nativescript/core';

import { FakeFrameService } from './ns-location-strategy.spec';
const CLOSE_WAIT = isIOS ? 1000 : 0;

@Component({
  selector: 'modal-comp',
  template: `<Label text="this is modal component" (shownModally)="onShownModally()"></Label>`,
  schemas: [NO_ERRORS_SCHEMA],
})
export class ModalComponent {
  constructor(public params: ModalDialogParams) {}

  onShownModally() {
    const result = this.params.context;
    this.params.closeCallback(result);
  }
}

@Component({
  selector: 'fail-comp',
  providers: [ModalDialogService],
  template: `<Label text="This app is doomed"></Label>`,
  schemas: [NO_ERRORS_SCHEMA],
})
export class FailComponent {
  constructor(public service: ModalDialogService) {}
}

@Component({
  selector: 'sucess-comp',
  providers: [ModalDialogService],
  template: ` <GridLayout margin="20">
    <Label text="Modal dialogs"></Label>
  </GridLayout>`,
  schemas: [NO_ERRORS_SCHEMA],
})
export class SuccessComponent {
  constructor(
    public service: ModalDialogService,
    public vcRef: ViewContainerRef,
    public locationStrategy: NSLocationStrategy,
    public fakeFrameService: FrameService,
  ) {}
}

@NgModule({
  imports: [FailComponent, SuccessComponent, ModalComponent],
  exports: [FailComponent, SuccessComponent, ModalComponent],
  // entryComponents: [ModalComponent],
  schemas: [NO_ERRORS_SCHEMA],
})
export class EntryComponentsTestModule {}

describe('modal-dialog', () => {
  // beforeEach(nsTestBedBeforeEach(
  //     [FailComponent, SuccessComponent],
  //     [{ provide: FrameService, useValue: new FakeFrameService() }, NSLocationStrategy],
  //     [],
  //     [ModalComponent]));
  beforeEach(() => {
    return TestBed.configureTestingModule({
      imports: [FailComponent, SuccessComponent, ModalComponent],
      providers: [{ provide: FrameService, useValue: new FakeFrameService() }, NSLocationStrategy],
    }).compileComponents();
  });
  //   beforeAll((done) => {
  //     // HACK: Wait for the navigations from the test runner app
  //     // Remove the setTimeout when test runner start tests on page.navigatedTo
  //     // setTimeout(() => done(), 1000);
  //     done()
  //   });

  afterEach((done) => {
    const page = Frame.topmost().currentPage;
    if (page && page.modal) {
      console.log('Warning: closing a leftover modal page!');
      page.modal.closeModal();
    }
    if (CLOSE_WAIT > 0) {
      setTimeout(done, CLOSE_WAIT);
    } else {
      done();
    }
  });

  it('showModal does not throws when there is no viewContainer provided', waitForAsync(async () => {
    const fixture = TestBed.createComponent(FailComponent);
    const service = <ModalDialogService>fixture.componentRef.instance.service;
    await fixture.whenRenderingDone();
    // expect(() => service.showModal(ModalComponent, {})).toThrow("No viewContainerRef: Make sure you pass viewContainerRef in ModalDialogOptions.");
    expect(() => service.showModal(ModalComponent, {})).not.toThrow();
  }));

  it('showModal succeeds when there is viewContainer provided', waitForAsync(async () => {
    const fixture = TestBed.createComponent(SuccessComponent);
    const service = fixture.componentRef.instance.service;
    const locStrategy = fixture.componentRef.instance.locationStrategy;
    await fixture.whenRenderingDone();
    const outlet = new Outlet('primary', null, 'primary', 0);
    let parentView = fixture.componentRef.instance.vcRef.element.nativeElement;
    parentView = parentView.page && parentView.page.frame;
    outlet.frames.push(parentView);
    locStrategy._getOutlets().push(outlet);

    locStrategy.pushState(null, 'test', '/test', null);

    const comp = fixture.componentRef.instance;
    service.showModal(ModalComponent, { viewContainerRef: comp.vcRef }).catch((e) => fail(e));
  }));

  it('showModal passes modal params and gets result when resolved', waitForAsync(async () => {
    const context = { property: 'my context' };
    const fixture = TestBed.createComponent(SuccessComponent);

    const service = <ModalDialogService>fixture.componentRef.instance.service;
    const locStrategy = <NSLocationStrategy>fixture.componentRef.instance.locationStrategy;
    const outlet = new Outlet('primary', null, 'primary', 0);

    let parentView = fixture.componentRef.instance.vcRef.element.nativeElement;
    parentView = parentView.page && parentView.page.frame;
    outlet.frames.push(parentView);
    locStrategy._getOutlets().push(outlet);

    locStrategy.pushState(null, 'test', '/test', null);

    const comp = <SuccessComponent>fixture.componentRef.instance;
    service
      .showModal(ModalComponent, {
        viewContainerRef: comp.vcRef,
        context: context,
      })
      .then((res) => {
        expect(res).toEqual(context);
      })
      .catch((e) => fail(e));
  }));
});
