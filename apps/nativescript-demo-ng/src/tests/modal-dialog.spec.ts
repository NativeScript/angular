// make sure you import mocha-config before @angular/core
import { Component, inject, NgModule, NO_ERRORS_SCHEMA, ViewContainerRef } from '@angular/core';
import { TestBed, waitForAsync } from '@angular/core/testing';
import { FrameService, ModalDialogParams, ModalDialogService, NativeScriptCommonModule, NSLocationStrategy, Outlet } from '@nativescript/angular';
import { Application, View } from '@nativescript/core';

import { FakeFrameService } from './ns-location-strategy.spec';

/**
 * Resolves once `condition` is truthy, polling on each frame. Unlike a fixed delay this resolves
 * as soon as the awaited state is reached (e.g. a modal finishing its animated dismissal), with a
 * bounded safety timeout so a stuck condition can't hang the suite.
 */
function waitUntil(condition: () => boolean, timeout = 5000): Promise<void> {
  return new Promise((resolve, reject) => {
    const start = Date.now();
    const check = () => {
      if (condition()) {
        resolve();
      } else if (Date.now() - start > timeout) {
        reject(new Error('Timed out waiting for condition'));
      } else {
        setTimeout(check, 16);
      }
    };
    check();
  });
}

@Component({
  selector: 'modal-comp',
  template: `<Label text="this is modal component" (shownModally)="onShownModally()"></Label>`,
  imports: [NativeScriptCommonModule],
  schemas: [NO_ERRORS_SCHEMA],
})
export class ModalComponent {
  params = inject(ModalDialogParams);

  onShownModally() {
    const result = this.params.context;
    this.params.closeCallback(result);
  }
}

@Component({
  selector: 'fail-comp',
  providers: [ModalDialogService],
  template: `<Label text="This app is doomed"></Label>`,
  imports: [NativeScriptCommonModule],
  schemas: [NO_ERRORS_SCHEMA],
})
export class FailComponent {
  service = inject(ModalDialogService);
}

@Component({
  selector: 'sucess-comp',
  providers: [ModalDialogService],
  template: ` <GridLayout margin="20">
    <Label text="Modal dialogs"></Label>
  </GridLayout>`,
  imports: [NativeScriptCommonModule],
  schemas: [NO_ERRORS_SCHEMA],
})
export class SuccessComponent {
  service = inject(ModalDialogService);
  vcRef = inject(ViewContainerRef);
  locationStrategy = inject(NSLocationStrategy);
  fakeFrameService = inject(FrameService);
}

@NgModule({
  imports: [FailComponent, SuccessComponent, ModalComponent, NativeScriptCommonModule],
  exports: [FailComponent, SuccessComponent, ModalComponent],
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
      imports: [FailComponent, SuccessComponent, ModalComponent, NativeScriptCommonModule],
      providers: [{ provide: FrameService, useValue: new FakeFrameService() }, NSLocationStrategy],
    }).compileComponents();
  });
  //   beforeAll((done) => {
  //     // HACK: Wait for the navigations from the test runner app
  //     // Remove the setTimeout when test runner start tests on page.navigatedTo
  //     // setTimeout(() => done(), 1000);
  //     done()
  //   });

  afterEach(async () => {
    // Close any modal still presented (via core's global registry) and wait until it has actually
    // finished dismissing before the next test runs.
    //
    // Note: `closeModal()` removes the modal from `_rootModalViews` *synchronously*, before the
    // animated dismissal starts, so the registry being empty does NOT mean the modal is gone. On
    // iOS the parent keeps a `presentedViewController` until the dismiss animation completes — and
    // that's exactly what makes the next `showModal` fail with "already presenting" — so wait on it.
    const open = ((Application.getRootView()?._getRootModalViews() ?? []) as View[]).slice();
    // Capture parents before closing: `closeModal()` nulls `_modalParent` synchronously.
    const parents = open
      .map((modal) => (modal as { _modalParent?: View })._modalParent)
      .filter((parent): parent is View => !!parent);
    open.forEach((modal) => modal.closeModal());
    const isPresenting = (parent: View) => !!(parent as { viewController?: { presentedViewController?: unknown } }).viewController?.presentedViewController;
    await waitUntil(() => parents.every((parent) => !isPresenting(parent))).catch(() => undefined);
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
