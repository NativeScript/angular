import { NgModule, NO_ERRORS_SCHEMA } from '@angular/core';
import { NativeScriptCommonModule } from '@nativescript/angular';
import { ItemDetailComponent } from './item-detail2.component';
import { Items2RoutingModule } from './item2-routing.module';

@NgModule({
  imports: [NativeScriptCommonModule, Items2RoutingModule],
  declarations: [ItemDetailComponent],
  exports: [Items2RoutingModule],
  schemas: [NO_ERRORS_SCHEMA],
})
export class Item2Module {}
