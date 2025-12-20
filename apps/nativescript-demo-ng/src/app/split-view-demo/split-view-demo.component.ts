import { Component, inject, NO_ERRORS_SCHEMA, OnInit, AfterViewInit } from '@angular/core';
import {
  NativeScriptCommonModule,
  NativeScriptRouterModule,
  PageRouterOutlet,
  RouterExtensions,
} from '@nativescript/angular';
import { SplitViewState } from './split-view.state';

@Component({
  selector: 'ns-split-view-demo',
  templateUrl: './split-view-demo.component.html',
  imports: [NativeScriptCommonModule, NativeScriptRouterModule, PageRouterOutlet],
  schemas: [NO_ERRORS_SCHEMA],
})
export class SplitViewDemoComponent implements OnInit, AfterViewInit {
  router = inject(RouterExtensions);
  splitViewState = inject(SplitViewState);

  ngOnInit() {
    console.log('[SplitViewDemo] ngOnInit');
  }

  ngAfterViewInit() {
    console.log('[SplitViewDemo] ngAfterViewInit - view is initialized, navigating to outlets');
    // Use setTimeout to ensure the view is fully rendered and outlets are registered
    setTimeout(() => {
      console.log('[SplitViewDemo] Navigating to outlets...');
      this.router
        .navigate(
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
        )
        .then((success) => {
          console.log(`[SplitViewDemo] navigation result: ${success}`);
        })
        .catch((err) => {
          console.error(`[SplitViewDemo] navigation error: ${err}`);
        });
    }, 0);
  }
}
