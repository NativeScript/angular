import { Component, injectAsync, NO_ERRORS_SCHEMA, signal } from '@angular/core';
import { NativeScriptCommonModule } from '@nativescript/angular';

/**
 * `injectAsync()` resolves a dependency that is provided behind a dynamic
 * import — the LazyGreeter chunk isn't loaded until you tap the button.
 */
@Component({
  selector: 'demo-inject-async',
  template: `
    <StackLayout class="demo-box">
      <Label [text]="output() || 'LazyGreeter has not been loaded yet.'" class="demo-readout" textWrap="true"></Label>
      <Button [text]="loading() ? 'Loading…' : 'await injectAsync(LazyGreeter)'" [isEnabled]="!loading()" (tap)="run()" class="demo-btn mt-2"></Button>
      <Label text="The greeter ships in its own lazy chunk; injectAsync() awaits it on demand." class="demo-hint" textWrap="true"></Label>
    </StackLayout>
  `,
  imports: [NativeScriptCommonModule],
  schemas: [NO_ERRORS_SCHEMA],
})
export class InjectAsyncDemoComponent {
  // injectAsync must run in an injection context — a field initializer qualifies.
  private readonly loadGreeter = injectAsync(() => import('./lazy-greeter.service').then((m) => m.LazyGreeter));

  readonly output = signal('');
  readonly loading = signal(false);

  async run() {
    this.loading.set(true);
    try {
      const greeter = await this.loadGreeter();
      this.output.set(greeter.greet('Angular 22'));
    } catch (e: any) {
      this.output.set('Failed to load: ' + (e?.message ?? e));
    } finally {
      this.loading.set(false);
    }
  }
}
