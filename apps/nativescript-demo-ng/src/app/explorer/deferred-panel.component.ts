import { Component, NO_ERRORS_SCHEMA, signal } from '@angular/core';
import { NativeScriptCommonModule } from '@nativescript/angular';

/**
 * A deliberately separate standalone component used ONLY inside a
 * `@defer` block on the detail page. Because nothing else imports it,
 * the Angular compiler code-splits it into its own lazy chunk that is
 * fetched on demand when the defer trigger fires.
 */
@Component({
  selector: 'ng22-deferred-panel',
  template: `
    <StackLayout class="deferred-panel mb-3">
      <Label text="🏝️" class="deferred-glyph"></Label>
      <Label text="Island hydrated!" class="deferred-title"></Label>
      <Label [text]="'This component shipped in its own lazy chunk and ran ' + builtAt()" class="deferred-body" textWrap="true"></Label>
    </StackLayout>
  `,
  imports: [NativeScriptCommonModule],
  schemas: [NO_ERRORS_SCHEMA],
})
export class DeferredPanelComponent {
  // Proves the component instantiated at hydration time, not at page load.
  readonly builtAt = signal(`at ${new Date().toLocaleTimeString()}`);
}
