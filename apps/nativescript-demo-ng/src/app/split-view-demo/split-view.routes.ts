import { Routes } from '@angular/router';
import { SplitViewPrimaryComponent } from './split-view-primary.component';
import { SplitViewSecondaryComponent } from './split-view-secondary.component';
import { SplitViewSupplementaryComponent } from './split-view-supplementary.component';
import { SplitViewInspectorComponent } from './split-view-inspector.component';

// Since SplitViewDemoComponent is bootstrapped directly, we don't include it in routes.
// The named outlets are defined in SplitViewDemoComponent's template,
// and these child routes activate into those outlets.
export const SPLIT_VIEW_ROUTES: Routes = [
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
];
