import { ChangeDetectionStrategy, Component, inject, NO_ERRORS_SCHEMA } from "@angular/core"
import { NativeScriptCommonModule, NativeScriptRouterModule, RouterExtensions } from "../../../../../packages/angular/src"

@Component({
    selector: 'app-input-bidings',
    standalone: true,
    imports: [
      NativeScriptCommonModule, NativeScriptRouterModule,
    ],
    template: `<Label text="Redirecting">`,
    changeDetection: ChangeDetectionStrategy.OnPush,
    schemas: [NO_ERRORS_SCHEMA]
  })
  export class RedirectPage {
  
    protected readonly router = inject(RouterExtensions)
  
    constructor() {
      this.router.navigate(['/bindings/test/'], { queryParams: { id: 1}, clearHistory: true})
    }
   }
   