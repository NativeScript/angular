import { CommonModule } from '@angular/common';
import { NO_ERRORS_SCHEMA, NgModule } from '@angular/core';
import { ListViewComponent } from './cdk/list-view/list-view.component';
import { ModalDialogService } from './legacy/directives/dialogs';

@NgModule({
  declarations: [ListViewComponent],
  providers: [ModalDialogService],
  imports: [CommonModule],
  exports: [CommonModule, ListViewComponent],
  schemas: [NO_ERRORS_SCHEMA],
})
export class NativeScriptCommonModule {}
