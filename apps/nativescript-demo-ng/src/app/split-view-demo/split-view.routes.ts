import { Routes } from '@angular/router';
import { SplitViewDemoComponent } from './split-view-demo.component';
import { SplitViewPrimaryComponent } from './split-view-primary.component';
import { SplitViewSecondaryComponent } from './split-view-secondary.component';
import { SplitViewSupplementaryComponent } from './split-view-supplementary.component';
import { SplitViewInspectorComponent } from './split-view-inspector.component';

export const SPLIT_VIEW_ROUTES: Routes = [
  {
    path: '',
    component: SplitViewDemoComponent,
    children: [
      {
        path: '',
        redirectTo: '/split-view-demo/(primary:primary//secondary:secondary//supplementary:supplementary//inspector:inspector)',
        pathMatch: 'full',
      },
      {
        path: 'primary',
        component: SplitViewPrimaryComponent,
        outlet: 'primary',
      },
      {
        path: 'secondary',
        component: SplitViewSecondaryComponent,
        outlet: 'secondary',
      },
      {
        path: 'supplementary',
        component: SplitViewSupplementaryComponent,
        outlet: 'supplementary',
      },
      {
        path: 'inspector',
        component: SplitViewInspectorComponent,
        outlet: 'inspector',
      },
    ],
  },
];
