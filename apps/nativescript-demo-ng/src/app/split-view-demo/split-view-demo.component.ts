import { Component, NO_ERRORS_SCHEMA } from '@angular/core';
import { NativeScriptCommonModule, NativeScriptRouterModule } from '@nativescript/angular';

@Component({
  selector: 'ns-split-view-demo',
  templateUrl: './split-view-demo.component.html',
  imports: [NativeScriptCommonModule, NativeScriptRouterModule],
  standalone: true,
  schemas: [NO_ERRORS_SCHEMA],
})
export class SplitViewDemoComponent {}
