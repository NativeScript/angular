import { Component, ViewContainerRef } from '@angular/core';

// registerElement('ns-app', () => GridLayout);
@Component({
  selector: 'ns-app',
  moduleId: module.id,
  templateUrl: './app.component.html',
})
export class AppComponent {
  constructor(private vcRef: ViewContainerRef) {}
  ngOnInit() {
    console.log('ngOnInit');
  }

  ngOnDestroy() {
    console.log('ngOnDestroy');
  }
}
