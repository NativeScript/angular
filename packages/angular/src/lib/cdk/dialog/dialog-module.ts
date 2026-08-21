import { NgModule } from '@angular/core';
import { NativeDialogCloseDirective } from './dialog-content-directives';

/**
 * Convenience module that re-exports the `NativeDialogCloseDirective` for
 * template-driven `[nativeDialogClose]` usage.
 *
 * **Important**: `NativeDialog` itself is **not** listed in this module's
 * `providers` array. The service is `@Injectable({ providedIn: 'root' })`,
 * which already registers a single root-level instance and is fully
 * tree-shakeable. Listing it here as well caused Angular to treat the
 * module-level provider and the `providedIn: 'root'` factory as
 * *separate* registrations once the module was pulled into a standalone
 * app via `importProvidersFrom(NativeDialogModule, ...)`. The duplicate
 * registration triggered:
 *
 *  - Two `NativeDialog` instances in the same root environment injector,
 *    each subscribing to `postAngularBootstrap$`, which produced
 *    duplicate restore attempts during HMR.
 *  - `NG0200: Circular dependency detected for NativeDialog` while a
 *    captured modal was being re-opened during HMR restore, because the
 *    second resolution started while the first was still in progress.
 *
 * Removing the redundant entry collapses both providers back into a
 * single root-level instance, which is what `providedIn: 'root'`
 * documents. App authors who explicitly wire `NativeDialog` themselves
 * (e.g. in a feature module's `providers`) keep working unchanged
 * because they're targeting the same class symbol.
 */
@NgModule({
  imports: [NativeDialogCloseDirective],
  exports: [NativeDialogCloseDirective],
})
export class NativeDialogModule {}
