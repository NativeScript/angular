import { Component, inject, NO_ERRORS_SCHEMA, OnInit } from '@angular/core';
import {
  NativeScriptCommonModule,
  NativeScriptRouterModule,
  PageRouterOutlet,
  RouterExtensions,
} from '@nativescript/angular';

@Component({
  selector: 'ns-split-view-demo',
  templateUrl: './split-view-demo.component.html',
  imports: [NativeScriptCommonModule, NativeScriptRouterModule, PageRouterOutlet],
  schemas: [NO_ERRORS_SCHEMA],
})
export class SplitViewDemoComponent implements OnInit {
  router = inject(RouterExtensions);

  ngOnInit() {
    this.router.navigate(
      [
        '/',
        {
          outlets: {
            primary: ['primary'],
            secondary: ['secondary'],
            supplementary: ['supplementary'],
            inspector: ['inspector'],
          },
        },
      ],
      { animated: false },
    );
  }
}
