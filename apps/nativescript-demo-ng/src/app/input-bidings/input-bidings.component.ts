import { ChangeDetectionStrategy, Component, inject, input, NO_ERRORS_SCHEMA } from '@angular/core';
import { NativeScriptCommonModule, RouterExtensions } from '../../../../../packages/angular/src';

@Component({
  selector: 'app-input-bidings',
  standalone: true,
  imports: [
    NativeScriptCommonModule,
  ],
  templateUrl: `./input-bidings.component.html`,
  styleUrl: './input-bidings.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
  schemas: [NO_ERRORS_SCHEMA]
})
export class InputBidingsComponent {

  protected readonly router = inject(RouterExtensions)
  
  name = input(); //Route param

  id = input(); //Query param

  data = input<string[]>(); // Resolver

  navigationTo() {
    this.router.navigate(['/bindings/testing2/'], { queryParams: { id: 10}})
  }
 }
