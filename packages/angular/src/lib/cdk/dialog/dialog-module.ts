import { NgModule } from '@angular/core';
import { NativeDialogCloseDirective } from './dialog-content-directives';
import { NativeDialogService } from './dialog-services';

@NgModule({
  declarations: [NativeDialogCloseDirective],
  exports: [NativeDialogCloseDirective],
  providers: [NativeDialogService],
})
export class NativeDialogModule {}
