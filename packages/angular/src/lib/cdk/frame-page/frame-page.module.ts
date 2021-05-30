import { NgModule } from '@angular/core';
import { FramePageComponent } from './frame-page.component';
import { FrameDirective } from './frame.directive';
import { PageDirective } from './page.directive';

@NgModule({
  declarations: [FrameDirective, PageDirective, FramePageComponent],
  exports: [FrameDirective, PageDirective, FramePageComponent],
})
export class FramePageModule {}
