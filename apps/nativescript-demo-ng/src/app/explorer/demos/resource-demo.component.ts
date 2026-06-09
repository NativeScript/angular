import { Component, NO_ERRORS_SCHEMA, resource, signal } from '@angular/core';
import { NativeScriptCommonModule } from '@nativescript/angular';

const TIPS = ['Signals make change detection surgical.', 'Prefer computed() over manual recomputation.', 'resource() models async state as signals.', 'OnPush is the default in Angular 22.', '@defer ships less JavaScript up front.'];

/**
 * A real `resource()` — its `status()` and `value()` are signals that move
 * through loading → resolved as the async loader runs. Bumping the params
 * signal reruns the loader (reloading state).
 */
@Component({
  selector: 'demo-resource',
  template: `
    <StackLayout class="demo-box">
      <GridLayout columns="auto,*" class="demo-controls">
        <Label col="0" [text]="badge()" [class]="badgeClass()"></Label>
        <Label col="1" [text]="'status() = ' + tip.status()" class="demo-sub pl-2" verticalAlignment="center"></Label>
      </GridLayout>
      <Label [text]="tip.value() ? '“' + tip.value() + '”' : 'Loading the first tip…'" class="demo-readout mt-2" textWrap="true"></Label>
      <Button [text]="tip.status() === 'loading' || tip.status() === 'reloading' ? 'Loading…' : 'Load next tip'" [isEnabled]="tip.status() !== 'loading' && tip.status() !== 'reloading'" (tap)="next()" class="demo-btn mt-2"></Button>
      <Label text="resource({ params, loader }) — status and value are signals driving this view." class="demo-hint" textWrap="true"></Label>
    </StackLayout>
  `,
  imports: [NativeScriptCommonModule],
  schemas: [NO_ERRORS_SCHEMA],
})
export class ResourceDemoComponent {
  private readonly key = signal(0);

  readonly tip = resource({
    params: () => this.key(),
    loader: async ({ params }: { params: number }) => {
      await new Promise((r) => setTimeout(r, 800));
      return TIPS[params % TIPS.length];
    },
  });

  badge() {
    return this.tip.status() === 'resolved' ? '✓' : '◌';
  }

  badgeClass() {
    const ok = this.tip.status() === 'resolved';
    return 'demo-readout ' + (ok ? 'text-emerald-400' : 'text-amber-400');
  }

  next() {
    this.key.update((n) => n + 1);
  }
}
