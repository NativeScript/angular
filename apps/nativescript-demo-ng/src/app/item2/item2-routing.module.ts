import { NgModule } from '@angular/core';
import { NativeScriptRouterModule } from '@nativescript/angular';
import { Routes } from '@angular/router';

import { ItemDetailComponent } from './item-detail2.component';

const routes: Routes = [{ path: ':id', component: ItemDetailComponent }];

@NgModule({
  imports: [NativeScriptRouterModule.forChild(routes)],
  exports: [NativeScriptRouterModule],
})
export class Items2RoutingModule {}
