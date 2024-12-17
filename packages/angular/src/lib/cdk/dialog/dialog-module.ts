import { NgModule } from '@angular/core';
import { NativeDialogCloseDirective } from './dialog-content-directives';
import { NativeDialog } from './dialog-services';

@NgModule({
  imports: [NativeDialogCloseDirective],
  exports: [NativeDialogCloseDirective],
  providers: [NativeDialog],
})
export class NativeDialogModule {}
