import { NgModule } from '@angular/core';
import { NativeScriptRouterModule, NSEmptyOutletComponent } from '@nativescript/angular';
import { Routes } from '@angular/router';

import { ItemsComponent } from './item/items.component';
import { ItemDetailComponent } from './item/item-detail.component';
// import { HomeComponent } from './home/home.component';
// import { BootGuardService } from './boot-guard.service';

const routes: Routes = [
  { path: '', redirectTo: '/rootlazy', pathMatch: 'full' },
  { path: 'items', component: ItemsComponent },
  { path: 'item/:id', component: ItemDetailComponent },
  { path: 'item2', loadChildren: () => import('./item2/item2.module').then((m) => m.Item2Module) },
  { path: 'rootlazy', loadChildren: () => import('./item3/item3.module').then((m) => m.Item3Module) },

  /**
   * Test tab named outlets
   */
  // { path: '', redirectTo: '/home', pathMatch: 'full' },
  // {
  //   path: 'home',
  //   component: HomeComponent,
  //   canActivate: [BootGuardService],
  //   children: [
  //     {
  //       path: 'start',
  //       component: NSEmptyOutletComponent,
  //       loadChildren: () => import('./item3/item3.module').then((m) => m.Item3Module),
  //       outlet: 'startTab',
  //     },
  //   ],
  // },
  // {
  //   path: 'item2',
  //   loadChildren: () => import('./item2/item2.module').then((m) => m.Item2Module),
  // },
];

@NgModule({
  imports: [NativeScriptRouterModule.forRoot(routes)],
  exports: [NativeScriptRouterModule],
})
export class AppRoutingModule {}
