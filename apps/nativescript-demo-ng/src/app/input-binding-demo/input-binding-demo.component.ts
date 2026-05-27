import { Component, input, NO_ERRORS_SCHEMA } from '@angular/core';
import { NativeScriptCommonModule } from '@nativescript/angular';

@Component({
  selector: 'ns-input-binding-demo',
  template: `
    <ActionBar title="Input Binding Demo" class="action-bar"></ActionBar>
    <StackLayout class="p-4">
      <Label text="Route Input Binding Demo" class="text-2xl font-bold text-center"></Label>

      <Label class="mt-4 text-lg font-bold" text="Route Param:"></Label>
      <Label class="text-base" [text]="'name = ' + name()"></Label>

      <Label class="mt-4 text-lg font-bold" text="Query Param:"></Label>
      <Label class="text-base" [text]="'language = ' + language()"></Label>

      <Label class="mt-4 text-lg font-bold" text="Resolver Data:"></Label>
      <Label class="text-base" [text]="'timestamp = ' + timestamp()"></Label>

      <Label class="mt-4 text-lg font-bold" text="Static Route Data:"></Label>
      <Label class="text-base" [text]="'title = ' + title()"></Label>
    </StackLayout>
  `,
  imports: [NativeScriptCommonModule],
  schemas: [NO_ERRORS_SCHEMA],
})
export class InputBindingDemoComponent {
  name = input<string>();
  language = input<string>();
  timestamp = input<string>();
  title = input<string>();
}
