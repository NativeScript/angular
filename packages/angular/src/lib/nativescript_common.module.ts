import { CommonModule } from '@angular/common';
import { NO_ERRORS_SCHEMA, NgModule } from '@angular/core';
import { ListViewComponent, TemplateKeyDirective, ActionBarComponent, ActionBarScope, ActionItemDirective, NavigationButtonDirective } from './cdk';
import { ModalDialogService } from './legacy/directives/dialogs';

@NgModule({
  declarations: [ListViewComponent, TemplateKeyDirective, ActionBarComponent, ActionBarScope, ActionItemDirective, NavigationButtonDirective],
  providers: [ModalDialogService],
  imports: [CommonModule],
  exports: [CommonModule, ListViewComponent, TemplateKeyDirective, ActionBarComponent, ActionBarScope, ActionItemDirective, NavigationButtonDirective],
  schemas: [NO_ERRORS_SCHEMA],
})
export class NativeScriptCommonModule {}
