import { Component, NO_ERRORS_SCHEMA, OnDestroy, OnInit, ViewContainerRef } from '@angular/core';
import { PageRouterOutlet } from '@nativescript/angular';

// registerElement('ns-app', () => GridLayout);
@Component({
  selector: 'ns-app',
  moduleId: module.id,
  templateUrl: './app.component.html',
  imports: [PageRouterOutlet],
  schemas: [NO_ERRORS_SCHEMA],
})
export class AppComponent implements OnInit, OnDestroy {
  constructor(private vcRef: ViewContainerRef) {}
  ngOnInit() {
    console.log('ngOnInit');
  }

  ngOnDestroy() {
    console.log('ngOnDestroy');
  }
}
