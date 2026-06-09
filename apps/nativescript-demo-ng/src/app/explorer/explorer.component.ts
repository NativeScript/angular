import { Component, inject, NO_ERRORS_SCHEMA } from '@angular/core';
import { NativeScriptCommonModule, RouterExtensions } from '@nativescript/angular';
import { NgFeature } from './feature.model';
import { FeaturesService } from './features.service';

@Component({
  selector: 'ng22-explorer',
  templateUrl: './explorer.component.html',
  imports: [NativeScriptCommonModule],
  schemas: [NO_ERRORS_SCHEMA],
})
export class ExplorerComponent {
  protected readonly store = inject(FeaturesService);
  private readonly router = inject(RouterExtensions);

  onSearch(args: any) {
    this.store.query.set(args?.object?.text ?? '');
  }

  toggleCategory(cat: any) {
    this.store.setCategory(cat);
  }

  open(feature: NgFeature) {
    this.router.navigate(['/feature', feature.id], {
      transition: { name: 'slide', duration: 250 },
    });
  }
}
