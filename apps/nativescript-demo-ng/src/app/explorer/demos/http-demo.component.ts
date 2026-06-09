import { HttpClient } from '@angular/common/http';
import { Component, inject, NO_ERRORS_SCHEMA, signal } from '@angular/core';
import { NativeScriptCommonModule } from '@nativescript/angular';

/**
 * A real network request through `HttpClient`, which in Angular 22 runs on the
 * `FetchBackend` by default. Tapping fetches a one-line "zen" quote from GitHub.
 */
@Component({
  selector: 'demo-http',
  template: `
    <StackLayout class="demo-box">
      <Label [text]="result()" class="demo-readout" textWrap="true"></Label>
      <Button [text]="loading() ? 'Fetching…' : 'GET api.github.com/zen'" [isEnabled]="!loading()" (tap)="fetch()" class="demo-btn mt-2"></Button>
      <Label text="HttpClient.get() over the default Fetch backend — no XHR, no extra setup." class="demo-hint" textWrap="true"></Label>
    </StackLayout>
  `,
  imports: [NativeScriptCommonModule],
  schemas: [NO_ERRORS_SCHEMA],
})
export class HttpDemoComponent {
  private readonly http = inject(HttpClient);

  readonly result = signal('Tap below to fetch a Zen quote with HttpClient.');
  readonly loading = signal(false);

  fetch() {
    this.loading.set(true);
    this.http.get('https://api.github.com/zen', { responseType: 'text' }).subscribe({
      next: (text) => {
        this.result.set('“' + text + '”');
        this.loading.set(false);
      },
      error: (err) => {
        this.result.set('Request failed: ' + (err?.message ?? 'unknown error'));
        this.loading.set(false);
      },
    });
  }
}
