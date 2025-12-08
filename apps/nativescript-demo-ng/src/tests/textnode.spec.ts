import { Component, ElementRef, NO_ERRORS_SCHEMA, ViewChild } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { NativeScriptCommonModule, TextNode } from '@nativescript/angular';
import { TextBase } from '@nativescript/core';

@Component({
  template: `<Label #textElement>{{ text }}</Label>`,
  imports: [NativeScriptCommonModule],
  schemas: [NO_ERRORS_SCHEMA],
})
class TextNodeComponent {
  @ViewChild('textElement', { static: true }) textElement: ElementRef<TextBase>;
  text = 'textnode';
}

@Component({
  template: `<Label #textElement
    ><Span>{{ text }}</Span></Label
  >`,
  imports: [NativeScriptCommonModule],
  schemas: [NO_ERRORS_SCHEMA],
})
class TextNodeSpansComponent {
  @ViewChild('textElement', { static: true }) textElement: ElementRef<TextBase>;
  text = 'textnode';
}

describe('TextNode', () => {
  beforeEach(() => TestBed.configureTestingModule({ imports: [TextNodeComponent, TextNodeSpansComponent] }));
  it('should create a text node', () => {
    const textNode = new TextNode('foo');
    expect(textNode.text).toBe('foo');
  });
  it('should set initial text to Label', () => {
    const fixture = TestBed.createComponent(TextNodeComponent);
    fixture.detectChanges();
    const label = fixture.componentInstance.textElement.nativeElement;
    expect(label.text).toBe('textnode');
  });

  it('should clear Label text for null value', () => {
    const fixture = TestBed.createComponent(TextNodeComponent);
    fixture.componentInstance.text = null;
    fixture.detectChanges();
    const label = fixture.componentInstance.textElement.nativeElement;
    expect(label.text).toBe('');
  });

  it('should set initial text to Label with Spans', () => {
    const fixture = TestBed.createComponent(TextNodeSpansComponent);
    fixture.detectChanges();
    const label = fixture.componentInstance.textElement.nativeElement;
    expect(label.text).toBe('textnode');
  });

  it('should clear Label text with Spans for null value', () => {
    const fixture = TestBed.createComponent(TextNodeSpansComponent);
    fixture.componentInstance.text = null;
    fixture.detectChanges();
    const label = fixture.componentInstance.textElement.nativeElement;
    expect(label.text).toBe('');
  });
});
