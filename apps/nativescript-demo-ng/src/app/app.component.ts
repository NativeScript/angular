import { Component, NO_ERRORS_SCHEMA, OnDestroy, OnInit } from '@angular/core';
import { PageRouterOutlet } from '@nativescript/angular';

// registerElement('ns-app', () => GridLayout);
@Component({
  selector: 'ns-app',
  templateUrl: './app.component.html',
  imports: [PageRouterOutlet],
  schemas: [NO_ERRORS_SCHEMA],
})
export class AppComponent implements OnInit, OnDestroy {

  ngOnInit() {
    console.log('ngOnInit');
  }

  ngOnDestroy() {
    console.log('ngOnDestroy');
  }
}
