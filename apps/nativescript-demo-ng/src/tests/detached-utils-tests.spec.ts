import { Component, ComponentFactory, ComponentFactoryResolver, ComponentRef, EmbeddedViewRef, Injector, NgModule, NO_ERRORS_SCHEMA, TemplateRef, ViewChild, ViewContainerRef } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { generateDetachedLoader, generateNativeScriptView, NgViewRef } from '@nativescript/angular';
import { GridLayout, ProxyViewContainer } from '@nativescript/core';

@Component({
  template: `<ng-container #vc></ng-container><ng-template #template><GridLayout></GridLayout></ng-template>`,
})
export class GenerateViewComponent {
  @ViewChild('vc', { read: ViewContainerRef }) vc: ViewContainerRef;
  @ViewChild('template', { read: TemplateRef }) template: TemplateRef<void>;
  constructor(public injector: Injector) {}
}

@Component({
  template: `<GridLayout></GridLayout>`,
})
export class GeneratedComponent {}

@NgModule({
  declarations: [GeneratedComponent, GenerateViewComponent],
  schemas: [NO_ERRORS_SCHEMA],
})
export class GeneratedModule {}

describe('generateNativeScriptView', () => {
  let fixture: ComponentFixture<GenerateViewComponent>;
  let cleanup: Array<NgViewRef<unknown> | ComponentRef<unknown> | EmbeddedViewRef<unknown>> = [];
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [GenerateViewComponent, GeneratedComponent],
    }).compileComponents();
    fixture = TestBed.createComponent(GenerateViewComponent);
    fixture.detectChanges();
    await fixture.whenRenderingDone();
  });
  afterEach(() => {
    cleanup.forEach((v) => {
      if (v instanceof NgViewRef) {
        v.ref.destroy();
      }
      if (v instanceof ComponentRef || v instanceof EmbeddedViewRef) {
        v.destroy();
      }
    });
    cleanup = [];
  });

  it('should generate a native view', () => {
    const ngViewRef = generateNativeScriptView(GeneratedComponent, {
      injector: fixture.componentRef.instance.injector,
    });
    cleanup.push(ngViewRef);
    expect(ngViewRef.view).toBeInstanceOf(ProxyViewContainer);
    expect(ngViewRef.firstNativeLikeView).toBeInstanceOf(GridLayout);
  });

  it('should generate a native view from template', () => {
    const ngViewRef = generateNativeScriptView(fixture.componentInstance.template, {
      injector: fixture.componentRef.instance.injector,
    });
    cleanup.push(ngViewRef);
    expect(ngViewRef.view).toBeInstanceOf(GridLayout);
    expect(ngViewRef.firstNativeLikeView).toBeInstanceOf(GridLayout);
  });

  it('should reuse a DetachedLoaderRef', () => {
    const containerRef = generateDetachedLoader(fixture.componentRef.instance.injector.get(ComponentFactoryResolver), fixture.componentRef.instance.injector);
    cleanup.push(containerRef);
    const ngViewRef = generateNativeScriptView(GeneratedComponent, {
      injector: fixture.componentRef.instance.injector,
      detachedLoaderRef: containerRef,
    });
    cleanup.push(ngViewRef);
    ngViewRef.ref.destroy();
    expect(containerRef.hostView.destroyed).toBeFalse();
  });

  it('should destroy a DetachedLoaderRef', () => {
    const ngViewRef = generateNativeScriptView(GeneratedComponent, {
      injector: fixture.componentRef.instance.injector,
      viewContainerRef: fixture.componentInstance.vc,
    });
    cleanup.push(ngViewRef);
    ngViewRef.ref.destroy();
    expect((ngViewRef as any).detachedLoaderRef.hostView.destroyed).toBeTrue();
  });

  it('should destroy a DetachedLoaderRef from template', () => {
    const ngViewRef = generateNativeScriptView(fixture.componentInstance.template, {
      injector: fixture.componentRef.instance.injector,
    });
    cleanup.push(ngViewRef);
    ngViewRef.ref.destroy();
    expect((ngViewRef as any).detachedLoaderRef.hostView.destroyed).toBeTrue();
  });
});
