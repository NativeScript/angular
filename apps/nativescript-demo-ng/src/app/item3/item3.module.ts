import { NgModule, NO_ERRORS_SCHEMA } from '@angular/core';
import { NativeScriptCommonModule } from '@nativescript/angular';
import { ItemsComponent } from './items.component';
import { Items2RoutingModule } from './item3-routing.module';

@NgModule({
  imports: [NativeScriptCommonModule, Items2RoutingModule],
  declarations: [ItemsComponent],
  exports: [Items2RoutingModule],
  schemas: [NO_ERRORS_SCHEMA],
})
export class Item3Module {}
