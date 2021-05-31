import { NgModule } from '@angular/core';
import { NSDialogClose } from './dialog-content-directives';
import { NSDialog } from './dialog-directives';

@NgModule({
  declarations: [NSDialogClose],
  exports: [NSDialogClose],
  providers: [NSDialog],
})
export class NSDialogModule {}
