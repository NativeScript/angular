import { Component, ViewContainerRef, OnInit, OnDestroy, NO_ERRORS_SCHEMA } from '@angular/core';
import { NativeDialogModule, NativeScriptHttpClientModule, PageRouterOutlet } from '@nativescript/angular';
import { AppRoutingModule } from './app-routing.module';

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
