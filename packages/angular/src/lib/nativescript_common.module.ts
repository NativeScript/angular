import { CommonModule } from '@angular/common';
import { NO_ERRORS_SCHEMA, NgModule } from '@angular/core';
import { ListViewComponent, TemplateKeyDirective } from './cdk/list-view/list-view.component';
import { ModalDialogService } from './legacy/directives/dialogs';

@NgModule({
  declarations: [ListViewComponent, TemplateKeyDirective],
  providers: [ModalDialogService],
  imports: [CommonModule],
  exports: [CommonModule, ListViewComponent, TemplateKeyDirective],
  schemas: [NO_ERRORS_SCHEMA],
})
export class NativeScriptCommonModule {}
