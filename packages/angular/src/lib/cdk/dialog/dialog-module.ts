import { NgModule } from '@angular/core';
import { NativeDialogCloseDirective } from './dialog-content-directives';
import { NativeDialogService } from './dialog-services';

@NgModule({
  imports: [NativeDialogCloseDirective],
  exports: [NativeDialogCloseDirective],
  providers: [NativeDialogService],
})
export class NativeDialogModule {}
