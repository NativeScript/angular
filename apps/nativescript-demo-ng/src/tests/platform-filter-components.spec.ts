// make sure you import mocha-config before @angular/core
import { Component, ElementRef, inject, NO_ERRORS_SCHEMA } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { AndroidFilterComponent, DEVICE, IOSFilterComponent, AppleFilterComponent } from '@nativescript/angular';
import { platformNames } from '@nativescript/core/platform';
import { createDevice, dumpView } from './test-utils.spec';
@Component({
  template: ` <StackLayout>
    <ios><Label text="IOS"></Label></ios>
  </StackLayout>`,
  imports: [IOSFilterComponent],
  schemas: [NO_ERRORS_SCHEMA],
})
export class IosSpecificComponent {
  elementRef = inject(ElementRef);
}

@Component({
  template: ` <StackLayout>
    <apple><Label text="Apple"></Label></apple>
  </StackLayout>`,
  imports: [AppleFilterComponent],
  schemas: [NO_ERRORS_SCHEMA],
})
export class AppleSpecificComponent {
  elementRef = inject(ElementRef);
}

@Component({
  template: ` <StackLayout>
    <android><Label text="ANDROID"></Label></android>
  </StackLayout>`,
  imports: [AndroidFilterComponent],
  schemas: [NO_ERRORS_SCHEMA],
})
export class AndroidSpecificComponent {
  elementRef = inject(ElementRef);
}

@Component({
  template: ` <StackLayout>
    <Label android:text="ANDROID" ios:text="IOS"></Label>
  </StackLayout>`,
  schemas: [NO_ERRORS_SCHEMA],
})
export class PlatformSpecificAttributeComponent {
  elementRef = inject(ElementRef);
}

const DECLARATIONS = [PlatformSpecificAttributeComponent, AndroidSpecificComponent, IosSpecificComponent];

describe('Platform filter directives', () => {
  describe('on IOS device', () => {
    beforeEach(() => {
      return TestBed.configureTestingModule({
        imports: DECLARATIONS,
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
      console.log(dumpView(componentRoot, true));
      expect(dumpView(componentRoot, true).indexOf('label') < 0).toBe(true);
    });
    it('applies iOS specific attribute', () => {
      const fixture = TestBed.createComponent(PlatformSpecificAttributeComponent);
      fixture.detectChanges();
      const componentRef = fixture.componentRef;
      const componentRoot = componentRef.instance.elementRef.nativeElement;
      expect(dumpView(componentRoot, true)).toBe('(proxyviewcontainer (stacklayout (label[text=IOS])))');
    });
  });

  describe('on Apple device', () => {
    beforeEach(() => {
      return TestBed.configureTestingModule({
        imports: DECLARATIONS,
        providers: [{ provide: DEVICE, useValue: createDevice(platformNames.ios) }],
        schemas: [NO_ERRORS_SCHEMA],
      }).compileComponents();
    });
    it('does render apple specific content', () => {
      const fixture = TestBed.createComponent(AppleSpecificComponent);
      fixture.detectChanges();
      const componentRef = fixture.componentRef;
      const componentRoot = componentRef.instance.elementRef.nativeElement;
      expect(dumpView(componentRoot, true).indexOf('(label[text=Apple])') >= 0).toBe(__APPLE__);
    });
    it('does not render android specific content', () => {
      const fixture = TestBed.createComponent(AndroidSpecificComponent);
      fixture.detectChanges();
      const componentRef = fixture.componentRef;
      const componentRoot = componentRef.instance.elementRef.nativeElement;
      console.log(dumpView(componentRoot, true));
      expect(dumpView(componentRoot, true).indexOf('label') < 0).toBe(true);
    });
  });

  describe('on Android device', () => {
    beforeEach(() => {
      return TestBed.configureTestingModule({
        imports: DECLARATIONS,
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
      expect(dumpView(componentRoot, true).indexOf('label') < 0).toBe(true);
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
