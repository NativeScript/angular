import { Component, inject, NO_ERRORS_SCHEMA, TemplateRef, ViewChild, ViewContainerRef } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { FrameService, NativeDialogRef, NativeDialogService, NativeScriptCommonModule, NSLocationStrategy } from '@nativescript/angular';
import { View } from '@nativescript/core';
import { firstValueFrom } from 'rxjs';

import { FakeFrameService } from './ns-location-strategy.spec';
import { closeRemainingModals, isPresentingModally, topRootModalView } from './test-utils.spec';

@Component({
  selector: 'dialog-content-comp',
  template: `<GridLayout><Label text="dialog content"></Label></GridLayout>`,
  imports: [NativeScriptCommonModule],
  schemas: [NO_ERRORS_SCHEMA],
})
export class DialogContentComponent {
  ref = inject(NativeDialogRef<DialogContentComponent>);
}

@Component({
  selector: 'dialog-host-comp',
  template: `<GridLayout>
    <Label text="dialog host"></Label>
    <ng-template #dialogTemplate><Label text="template dialog content"></Label></ng-template>
  </GridLayout>`,
  imports: [NativeScriptCommonModule],
  schemas: [NO_ERRORS_SCHEMA],
})
export class DialogHostComponent {
  dialog = inject(NativeDialogService);
  vcRef = inject(ViewContainerRef);
  @ViewChild('dialogTemplate', { static: true }) dialogTemplate: TemplateRef<unknown>;
}

describe('native-dialog', () => {
  beforeEach(() => {
    return TestBed.configureTestingModule({
      imports: [DialogHostComponent, DialogContentComponent, NativeScriptCommonModule],
      providers: [{ provide: FrameService, useValue: new FakeFrameService() }, NSLocationStrategy],
    }).compileComponents();
  });

  afterEach(() => closeRemainingModals());

  async function createHost(): Promise<DialogHostComponent> {
    const fixture = TestBed.createComponent(DialogHostComponent);
    fixture.detectChanges();
    await fixture.whenRenderingDone();
    return fixture.componentRef.instance;
  }

  it(
    'afterOpened emits once the modal is fully presented',
    async () => {
      const host = await createHost();
      const ref = host.dialog.open(DialogContentComponent, { viewContainerRef: host.vcRef });
      await firstValueFrom(ref.afterOpened());
      const closed = firstValueFrom(ref.afterClosed());
      ref.close();
      await closed;
    },
    10000,
  );

  it(
    'afterClosed emits only after the native dismissal completes, so a new dialog can open immediately',
    async () => {
      const host = await createHost();
      const hostView: View = host.vcRef.element.nativeElement;

      const firstRef = host.dialog.open(DialogContentComponent, { viewContainerRef: host.vcRef });
      await firstValueFrom(firstRef.afterOpened());

      const events: string[] = [];
      firstRef.beforeClosed().subscribe(() => events.push('beforeClosed'));
      firstRef.afterClosed().subscribe(() => events.push('afterClosed'));

      const closed = firstValueFrom(firstRef.afterClosed());
      firstRef.close('first result');
      expect(await closed).toEqual('first result');
      expect(events).toEqual(['beforeClosed', 'afterClosed']);
      // On iOS a premature afterClosed would leave the parent still presenting the old
      // view controller, which is what makes the next showModal fail.
      expect(isPresentingModally(hostView)).toBe(false);

      const secondRef = host.dialog.open(DialogContentComponent, { viewContainerRef: host.vcRef });
      await firstValueFrom(secondRef.afterOpened());
      const secondClosed = firstValueFrom(secondRef.afterClosed());
      secondRef.close();
      await secondClosed;
    },
    15000,
  );

  it(
    'afterClosed emits when a component dialog is dismissed natively',
    async () => {
      const host = await createHost();
      const ref = host.dialog.open(DialogContentComponent, { viewContainerRef: host.vcRef });
      await firstValueFrom(ref.afterOpened());

      const closed = firstValueFrom(ref.afterClosed());
      // Dismiss through core, like the user swiping down or pressing back.
      topRootModalView().closeModal();
      await closed;
    },
    10000,
  );

  it(
    'afterClosed emits when a template dialog is dismissed natively',
    async () => {
      const host = await createHost();
      const ref = host.dialog.open(host.dialogTemplate, { viewContainerRef: host.vcRef });
      await firstValueFrom(ref.afterOpened());

      const closed = firstValueFrom(ref.afterClosed());
      topRootModalView().closeModal();
      await closed;
    },
    10000,
  );
});
