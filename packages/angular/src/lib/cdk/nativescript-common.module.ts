import { CommonModule } from '@angular/common';
import { NO_ERRORS_SCHEMA, NgModule } from '@angular/core';
import { FramePageModule } from './frame-page/frame-page.module';
import { ActionBarComponent, ActionBarScope, ActionItemDirective, NavigationButtonDirective } from './action-bar';
import { DetachedLoader } from './detached-loader';
import { ListViewComponent, TemplateKeyDirective } from './list-view/list-view.component';

const CDK_COMPONENTS = [ActionBarComponent, ActionBarScope, ActionItemDirective, NavigationButtonDirective, ListViewComponent, TemplateKeyDirective, DetachedLoader];

@NgModule({
  imports: [CommonModule, FramePageModule],
  exports: [CommonModule, FramePageModule, ...CDK_COMPONENTS],
  declarations: [...CDK_COMPONENTS],
  providers: [],
  schemas: [NO_ERRORS_SCHEMA],
})
export class NativeScriptCommonModule {}
