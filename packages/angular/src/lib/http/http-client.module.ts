import {
  HttpBackend,
  HttpFeature,
  HttpFeatureKind,
  provideHttpClient,
  withInterceptorsFromDi,
  withXhr
} from '@angular/common/http';
import { makeEnvironmentProviders, NgModule } from '@angular/core';

import { NSFileSystem } from '../file-system/ns-file-system';
import { NsHttpBackEnd } from './ns-http-backend';

export function provideNativeScriptHttpClient(...features: HttpFeature<HttpFeatureKind>[]) {
  return makeEnvironmentProviders([
    provideHttpClient(withXhr(), ...features),
    NSFileSystem,
    NsHttpBackEnd,
    { provide: HttpBackend, useExisting: NsHttpBackEnd },
  ]);
}
@NgModule({
  providers: [provideNativeScriptHttpClient(withInterceptorsFromDi())],
})
export class NativeScriptHttpClientModule {}
