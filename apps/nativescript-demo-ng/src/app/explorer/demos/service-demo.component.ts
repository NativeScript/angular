import { Component, inject, NO_ERRORS_SCHEMA } from '@angular/core';
import { NativeScriptCommonModule } from '@nativescript/angular';
import { TapTallyService } from './tap-tally.service';

/**
 * The store below is declared with `@Service()` and injected here with zero
 * provider wiring — proving the decorator auto-provides into the DI system.
 */
@Component({
  selector: 'demo-service',
  template: `
    <StackLayout class="demo-box">
      <Label [text]="'tally.taps() = ' + tally.taps()" class="demo-readout"></Label>
      <GridLayout columns="*,*" class="demo-controls">
        <Button col="0" text="tally.bump()" (tap)="tally.bump()" class="demo-btn"></Button>
        <Button col="1" text="reset" (tap)="tally.reset()" class="demo-btn-ghost"></Button>
      </GridLayout>
      <Label text="TapTallyService is decorated with @Service() — injected here with no providedIn and no providers array." class="demo-hint" textWrap="true"></Label>
    </StackLayout>
  `,
  imports: [NativeScriptCommonModule],
  schemas: [NO_ERRORS_SCHEMA],
})
export class ServiceDemoComponent {
  readonly tally = inject(TapTallyService);
}
