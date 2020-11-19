import { NgModule, Provider } from '@angular/core';
import { TestComponentRenderer } from '@angular/core/testing';
import { COMMON_PROVIDERS, APP_ROOT_VIEW, NativeScriptModule } from '@nativescript/angular';
import { NativeScriptTestComponentRenderer } from './nativescript_test_component_renderer';
import { testingRootView } from './test-root-view';

if (typeof Node === 'undefined' && !global.Node) {
  class DummyNode {}
  global.Node = DummyNode as any;
}

/**
 * Providers array is exported for cases where a custom module has to be constructed
 * to test a particular piece of code. This can happen, for example, if you are trying
 * to test dynamic component loading and need to specify an entryComponent for the testing
 * module.
 */
export const NATIVESCRIPT_TESTING_PROVIDERS: Provider[] = [...COMMON_PROVIDERS, { provide: APP_ROOT_VIEW, useFactory: testingRootView }, { provide: TestComponentRenderer, useClass: NativeScriptTestComponentRenderer }];

/**
 * NativeScript testing support module. Enables use of TestBed for angular components, directives,
 * pipes, and services.
 */
@NgModule({
  exports: [NativeScriptModule],
  providers: NATIVESCRIPT_TESTING_PROVIDERS,
})
export class NativeScriptTestingModule {}
