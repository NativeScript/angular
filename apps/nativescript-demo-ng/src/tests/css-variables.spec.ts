import {
  Component,
  ElementRef,
  inject,
  NO_ERRORS_SCHEMA,
  Renderer2,
  ViewChild,
  ViewEncapsulation,
} from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { NativeScriptCommonModule } from '@nativescript/angular';
import { Color, Label } from '@nativescript/core';

// Styles are written in the namespaced form Angular >= 22.1 compiles custom properties to,
// so these specs hold regardless of the compiler version the demo app builds with.

@Component({
  template: `<Label #label class="css-var-emulated"></Label>`,
  styles: ['.css-var-emulated { --%NS%probe-emulated: #ff0000; background-color: var(--%NS%probe-emulated); }'],
  imports: [NativeScriptCommonModule],
  schemas: [NO_ERRORS_SCHEMA],
})
class EmulatedCssVarComponent {
  @ViewChild('label', { static: true }) label: ElementRef<Label>;
  renderer = inject(Renderer2);
}

@Component({
  template: `<Label #label class="css-var-none"></Label>`,
  styles: ['.css-var-none { --%NS%probe-none: #00ff00; background-color: var(--%NS%probe-none); }'],
  encapsulation: ViewEncapsulation.None,
  imports: [NativeScriptCommonModule],
  schemas: [NO_ERRORS_SCHEMA],
})
class NoneCssVarComponent {
  @ViewChild('label', { static: true }) label: ElementRef<Label>;
}

describe('CSS custom properties', () => {
  beforeEach(() => TestBed.configureTestingModule({ imports: [EmulatedCssVarComponent, NoneCssVarComponent] }));

  it('applies namespaced custom properties in emulated component styles', () => {
    const fixture = TestBed.createComponent(EmulatedCssVarComponent);
    fixture.detectChanges();
    const label = fixture.componentInstance.label.nativeElement;
    expect(label.style.getCssVariable('--probe-emulated')).toBe('#ff0000');
    expect(label.style.backgroundColor?.hex).toBe(new Color('#ff0000').hex);
  });

  it('applies namespaced custom properties in unencapsulated component styles', () => {
    const fixture = TestBed.createComponent(NoneCssVarComponent);
    fixture.detectChanges();
    const label = fixture.componentInstance.label.nativeElement;
    expect(label.style.getCssVariable('--probe-none')).toBe('#00ff00');
    expect(label.style.backgroundColor?.hex).toBe(new Color('#00ff00').hex);
  });

  it('sets and removes namespaced custom properties through the renderer', () => {
    const fixture = TestBed.createComponent(EmulatedCssVarComponent);
    fixture.detectChanges();
    const { label, renderer } = fixture.componentInstance;
    renderer.setStyle(label.nativeElement, '--%NS%bound', 'blue');
    expect(label.nativeElement.style.getCssVariable('--bound')).toBe('blue');
    renderer.removeStyle(label.nativeElement, '--%NS%bound');
    expect(label.nativeElement.style.getCssVariable('--bound')).toBeNull();
  });
});
