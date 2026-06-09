import { Component, NO_ERRORS_SCHEMA, signal } from '@angular/core';
import { NativeScriptCommonModule } from '@nativescript/angular';

type Phase = 'idle' | 'loading' | 'success' | 'error';

/**
 * Exercises `@switch`. Because `phase` is a discriminated union, Angular 22's
 * exhaustive type-checking guarantees every case is handled — add a member to
 * `Phase` and the template fails to compile until you cover it.
 */
@Component({
  selector: 'demo-switch',
  template: `
    <StackLayout class="demo-box">
      <Label [text]="'phase() = ' + phase()" class="demo-sub"></Label>
      <StackLayout class="demo-switch-stage mt-2">
        @switch (phase()) {
          @case ('idle') {
            <Label text="💤  Idle — nothing happening yet." class="demo-readout text-slate-300" textWrap="true"></Label>
          }
          @case ('loading') {
            <Label text="⏳  Loading — fetching data…" class="demo-readout text-amber-400" textWrap="true"></Label>
          }
          @case ('success') {
            <Label text="✅  Success — all done!" class="demo-readout text-emerald-400" textWrap="true"></Label>
          }
          @case ('error') {
            <Label text="❌  Error — something broke." class="demo-readout text-rose-400" textWrap="true"></Label>
          }
        }
      </StackLayout>
      <Button text="Next state →" (tap)="cycle()" class="demo-btn mt-2"></Button>
      <Label text="Every union member is handled — exhaustive @switch type-checking enforces it at compile time." class="demo-hint" textWrap="true"></Label>
    </StackLayout>
  `,
  imports: [NativeScriptCommonModule],
  schemas: [NO_ERRORS_SCHEMA],
})
export class SwitchDemoComponent {
  private readonly order: Phase[] = ['idle', 'loading', 'success', 'error'];
  readonly phase = signal<Phase>('idle');

  cycle() {
    const i = this.order.indexOf(this.phase());
    this.phase.set(this.order[(i + 1) % this.order.length]);
  }
}
