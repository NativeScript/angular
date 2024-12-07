import { Component, ViewContainerRef, OnInit, OnDestroy } from '@angular/core';

// registerElement('ns-app', () => GridLayout);
@Component({
  selector: 'ns-app',
  moduleId: module.id,
  templateUrl: './app.component.html',
  standalone: false,
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
