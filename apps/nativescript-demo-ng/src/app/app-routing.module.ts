import { NgModule } from '@angular/core';
import { Routes } from '@angular/router';
import { NativeScriptRouterModule } from '@nativescript/angular';
import { dummyDataResolverTsResolver } from './input-bidings/dummy-data.resolver.ts.resolver';
import { ItemDetailComponent } from './item/item-detail.component';
import { ItemsComponent } from './item/items.component';
// import { HomeComponent } from './home/home.component';
// import { BootGuardService } from './boot-guard.service';

const routes: Routes = [
  { path: '', redirectTo: '/redirect', pathMatch: 'full' },
  { path: 'items', component: ItemsComponent },
  { path: 'item/:id', component: ItemDetailComponent },
  { path: 'item2', loadChildren: () => import('./item2/item2.module').then((m) => m.Item2Module) },
  { path: 'rootlazy', loadChildren: () => import('./item3/item3.module').then((m) => m.Item3Module) },
  { path: 'redirect', loadComponent: () => import('./input-bidings/redirect-page.component').then((c) => c.RedirectPage) },
  { path: 'bindings/:name', loadComponent: () => import('./input-bidings/input-bidings.component').then((c) => c.InputBidingsComponent), resolve: {
    data: dummyDataResolverTsResolver
  } },

  /**
   * Test tab named outlets
   */
  // { path: '', redirectTo: '/home', pathMatch: 'full' },
  // {
  //   path: 'home',
  //   component: HomeComponent,
  //   canActivate: [() => Promise.resolve(true)],
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
  imports: [NativeScriptRouterModule.forRoot(routes, {
    bindToComponentInputs: true,
  })],
  exports: [NativeScriptRouterModule],
})
export class AppRoutingModule {}
