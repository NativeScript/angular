import { Component } from '@angular/core';
@Component({
  selector: 'ns-app',
  moduleId: module.id,
  templateUrl: './app.component.html',
})
export class AppComponent {
  message = 'Hello Angular!';
  ngOnInit() {
    console.log('init');
  }

  ngOnDestroy() {
    console.log('destroyed');
  }
}
