import { CommonModule } from '@angular/common';
import { NO_ERRORS_SCHEMA, NgModule } from '@angular/core';
import { FramePageModule } from './cdk/frame-page/frame-page.module';
import { ActionBarComponent, ActionBarScope, ActionItemDirective, NavigationButtonDirective } from './cdk/action-bar';
import { ListViewComponent, TemplateKeyDirective } from './cdk/list-view/list-view.component';
import { registerNativeScriptViewComponents } from './element-registry';
import { ModalDialogService } from './legacy/directives/dialogs';
import { TabViewDirective, TabViewItemDirective } from './cdk/tab-view';

const CDK_COMPONENTS = [ActionBarComponent, ActionBarScope, ActionItemDirective, NavigationButtonDirective, ListViewComponent, TemplateKeyDirective, TabViewDirective, TabViewItemDirective];

registerNativeScriptViewComponents();

@NgModule({
  imports: [CommonModule, FramePageModule],
  declarations: [...CDK_COMPONENTS],
  exports: [CommonModule, FramePageModule, ...CDK_COMPONENTS],
  providers: [ModalDialogService],
  schemas: [NO_ERRORS_SCHEMA],
})
export class NativeScriptCommonModule {}
