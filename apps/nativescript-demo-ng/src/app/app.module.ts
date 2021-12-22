import { NgModule, NO_ERRORS_SCHEMA } from '@angular/core';
import { NativeScriptModule, NativeScriptCommonModule, NativeScriptHttpClientModule, NativeDialogModule } from '@nativescript/angular';

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { ItemsComponent } from './item/items.component';
import { ItemDetailComponent } from './item/item-detail.component';
import { ModalComponent } from './modal/modal.component';

/**
 * To test tab named outlets, can uncomment imports and declarations
 */
// import { HomeComponent } from './home/home.component';
// import { NativeScriptMaterialBottomNavigationModule } from '@nativescript-community/ui-material-bottom-navigation/angular';

@NgModule({
  bootstrap: [AppComponent],
  imports: [
    NativeScriptModule,
    NativeScriptHttpClientModule,
    AppRoutingModule,
    NativeDialogModule,
    // NativeScriptMaterialBottomNavigationModule
  ],
  declarations: [
    AppComponent,
    ItemsComponent,
    ItemDetailComponent,
    ModalComponent,
    // HomeComponent
  ],
  providers: [],
  schemas: [NO_ERRORS_SCHEMA],
})
export class AppModule {}
