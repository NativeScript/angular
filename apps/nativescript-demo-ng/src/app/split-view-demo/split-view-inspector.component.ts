import { Component, NO_ERRORS_SCHEMA } from '@angular/core';
import { NativeScriptCommonModule } from '@nativescript/angular';

@Component({
  selector: 'ns-split-view-inspector',
  template: `<GridLayout rows="auto,*" class="p-16">
    <Label row="0" text="Inspector" class="h2 mb-8"></Label>
    <Label row="1" text="This is the inspector column." class="text-center"></Label>
  </GridLayout>`,
  standalone: true,
  imports: [NativeScriptCommonModule],
  schemas: [NO_ERRORS_SCHEMA],
})
export class SplitViewInspectorComponent {}
