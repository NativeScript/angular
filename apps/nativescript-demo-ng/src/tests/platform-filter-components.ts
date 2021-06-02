// make sure you import mocha-config before @angular/core
import { Component, ElementRef, NgModule, NO_ERRORS_SCHEMA } from '@angular/core';
import { dumpView, createDevice } from './test-utils';
import { DEVICE, NativeScriptCommonModule, NativeScriptModule, registerElement } from '@nativescript/angular';
import { platformNames } from '@nativescript/core/platform';
import { TestBed } from '@angular/core/testing';
import { StackLayout } from '@nativescript/core';
@Component({
  template: ` <StackLayout>
    <ios><Label text="IOS"></Label></ios>
  </StackLayout>`,
})
export class IosSpecificComponent {
  constructor(public elementRef: ElementRef) {}
}

@Component({
  template: ` <StackLayout>
    <android><Label text="ANDROID"></Label></android>
  </StackLayout>`,
})
export class AndroidSpecificComponent {
  constructor(public elementRef: ElementRef) {}
}

@Component({
  template: ` <StackLayout>
    <Label android:text="ANDROID" ios:text="IOS"></Label>
  </StackLayout>`,
})
export class PlatformSpecificAttributeComponent {
  constructor(public elementRef: ElementRef) {}
}

const DECLARATIONS = [PlatformSpecificAttributeComponent, AndroidSpecificComponent, IosSpecificComponent];
@NgModule({
  declarations: DECLARATIONS,
  schemas: [NO_ERRORS_SCHEMA],
})
export class PlatformModule {}

describe('Platform filter directives', () => {
  describe('on IOS device', () => {
    beforeEach(() => {
      return TestBed.configureTestingModule({
        imports: [],
        declarations: DECLARATIONS,
        providers: [{ provide: DEVICE, useValue: createDevice(platformNames.ios) }],
        schemas: [NO_ERRORS_SCHEMA],
      }).compileComponents();
    });
    it('does render ios specific content', () => {
      const fixture = TestBed.createComponent(IosSpecificComponent);
      fixture.detectChanges();
      const componentRef = fixture.componentRef;
      const componentRoot = componentRef.instance.elementRef.nativeElement;
      expect(dumpView(componentRoot, true).indexOf('(label[text=IOS])') >= 0).toBe(true);
    });
    it('does not render android specific content', () => {
      const fixture = TestBed.createComponent(AndroidSpecificComponent);
      fixture.detectChanges();
      const componentRef = fixture.componentRef;
      const componentRoot = componentRef.instance.elementRef.nativeElement;
      expect(dumpView(componentRoot, true).indexOf('Label') < 0).toBe(true);
    });
    it('applies iOS specific attribute', () => {
      const fixture = TestBed.createComponent(PlatformSpecificAttributeComponent);
      fixture.detectChanges();
      const componentRef = fixture.componentRef;
      const componentRoot = componentRef.instance.elementRef.nativeElement;
      expect(dumpView(componentRoot, true)).toBe('(proxyviewcontainer (stacklayout (label[text=IOS])))');
    });
  });

  describe('on Android device', () => {
    beforeEach(() => {
      return TestBed.configureTestingModule({
        imports: [],
        declarations: DECLARATIONS,
        providers: [{ provide: DEVICE, useValue: createDevice(platformNames.android) }],
        schemas: [NO_ERRORS_SCHEMA],
      }).compileComponents();
    });

    it('does render android specific content', () => {
      const fixture = TestBed.createComponent(AndroidSpecificComponent);
      fixture.detectChanges();
      const componentRef = fixture.componentRef;
      const componentRoot = componentRef.instance.elementRef.nativeElement;
      expect(dumpView(componentRoot, true).indexOf('(label[text=ANDROID])') >= 0).toBe(true);
    });
    it('does not render ios specific content', () => {
      const fixture = TestBed.createComponent(IosSpecificComponent);
      fixture.detectChanges();
      const componentRef = fixture.componentRef;
      const componentRoot = componentRef.instance.elementRef.nativeElement;
      expect(dumpView(componentRoot, true).indexOf('Label') < 0).toBe(true);
    });
    it('applies Android specific attribute', () => {
      const fixture = TestBed.createComponent(PlatformSpecificAttributeComponent);
      fixture.detectChanges();
      const componentRef = fixture.componentRef;
      const componentRoot = componentRef.instance.elementRef.nativeElement;
      expect(dumpView(componentRoot, true)).toBe('(proxyviewcontainer (stacklayout (label[text=ANDROID])))');
    });
  });
});
