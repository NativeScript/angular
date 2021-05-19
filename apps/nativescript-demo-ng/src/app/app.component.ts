import { Component } from '@angular/core';
@Component({
  selector: 'ns-app',
  moduleId: module.id,
  templateUrl: './app.component.html',
})
export class AppComponent {
  ngOnInit() {
    console.log('ngOnInit');
  }

  ngOnDestroy() {
    console.log('ngOnDestroy');
  }
}
