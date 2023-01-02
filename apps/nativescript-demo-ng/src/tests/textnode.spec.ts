import { Component, ElementRef, NO_ERRORS_SCHEMA, ViewChild } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { TextNode } from '@nativescript/angular';
import { TextBase } from '@nativescript/core';

@Component({
  template: `<Label #textElement>{{ text }}</Label>`,
  schemas: [NO_ERRORS_SCHEMA],
  standalone: true,
})
class TextNodeComponent {
  @ViewChild('textElement', { static: true }) textElement: ElementRef<TextBase>;
  text = 'textnode';
}

@Component({
  template: `<Label #textElement
    ><Span>{{ text }}</Span></Label
  >`,
  schemas: [NO_ERRORS_SCHEMA],
  standalone: true,
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
  it('should set text to Label', () => {
    const fixture = TestBed.createComponent(TextNodeComponent);
    fixture.detectChanges();
    const label = fixture.componentInstance.textElement.nativeElement;
    expect(label.text).toBe('textnode');
    fixture.componentInstance.text = null;
    fixture.detectChanges();
    expect(label.text).toBe('');
  });

  it('should set text to Label with Spans', () => {
    const fixture = TestBed.createComponent(TextNodeSpansComponent);
    fixture.detectChanges();
    const label = fixture.componentInstance.textElement.nativeElement;
    expect(label.text).toBe('textnode');
    fixture.componentInstance.text = null;
    fixture.detectChanges();
    expect(label.text).toBe('');
  });
});
