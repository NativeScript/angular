import { CommonModule } from '@angular/common';
import { NO_ERRORS_SCHEMA, NgModule } from '@angular/core';
// import { FramePageModule } from './cdk';
// import { ActionBarComponent, ActionBarScope, ActionItemDirective, DetachedLoader, FrameDirective, FramePageComponent, ListViewComponent, NavigationButtonDirective, PageDirective, TemplateKeyDirective } from './cdk';
import { DetachedLoader, FrameDirective, FramePageComponent, ListViewComponent, PageDirective, TemplateKeyDirective } from './cdk';
// import { ModalDialogService } from './legacy/directives/dialogs';

// export const CDK_COMPONENTS = [ActionBarComponent, ActionBarScope, ActionItemDirective, NavigationButtonDirective, ListViewComponent, TemplateKeyDirective, FrameDirective, FramePageComponent, PageDirective, DetachedLoader]
export const CDK_COMPONENTS = [ListViewComponent, TemplateKeyDirective, FrameDirective, FramePageComponent, PageDirective, DetachedLoader];

// export const CDK_COMPONENTS = [];

@NgModule({
  declarations: [...CDK_COMPONENTS],
  providers: [],
  imports: [CommonModule],
  exports: [CommonModule, ...CDK_COMPONENTS],
  schemas: [NO_ERRORS_SCHEMA],
})
export class NativeScriptCommonModule {}
