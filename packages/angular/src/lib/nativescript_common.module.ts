import { CommonModule } from '@angular/common';
import { NO_ERRORS_SCHEMA, NgModule } from '@angular/core';
import { ModalDialogService } from './legacy/directives/dialogs';

@NgModule({
  declarations: [],
  providers: [ModalDialogService],
  imports: [CommonModule],
  exports: [CommonModule],
  schemas: [NO_ERRORS_SCHEMA],
})
export class NativeScriptCommonModule {}
