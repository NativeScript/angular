import { Service, signal } from '@angular/core';

/**
 * Demonstrates the new Angular 22 `@Service()` decorator.
 * No `@Injectable({ providedIn: 'root' })`, no providers array — `@Service()`
 * auto-provides the class to the DI system, so it can be `inject()`ed directly.
 */
@Service()
export class TapTallyService {
  readonly taps = signal(0);

  bump() {
    this.taps.update((n) => n + 1);
  }

  reset() {
    this.taps.set(0);
  }
}
