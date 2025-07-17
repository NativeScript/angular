/**
 * Note: we disable eslint on this test due to:
 * Parsing error: Unexpected character "EOF" (Do you have an unescaped "{" in your template? Use "{{ '{' }}") to escape it.) related to dynamic element names.
 */
import { Component, ElementRef, NO_ERRORS_SCHEMA, ViewChild } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { NativeScriptModule } from '@nativescript/angular';
import { TextBase } from '@nativescript/core';

const configureComponents = (textBaseElementName: string) => {
  class BaseComponent {
    @ViewChild('textBase', { static: true }) textBase: ElementRef<TextBase>;
  }

  let template = '';

  template = `<${textBaseElementName} #textBase>
      <Span text="0"></Span>
      <Span text="1"></Span>
      <Span text="2"></Span>
    </${textBaseElementName}>`;
  @Component({
    template,
  })
  class SpansComponent extends BaseComponent {}

  template = `<${textBaseElementName} #textBase>
      <FormattedString>
        <Span text="0"></Span>
        <Span text="1"></Span>
        <Span text="2"></Span>
      </FormattedString>
    </${textBaseElementName}>`;
  @Component({
    template,
  })
  class FormattedStringComponent extends BaseComponent {}

  template = `<${textBaseElementName} #textBase>
      <Span text="0"></Span>
      @if(show) {
        <Span text="1"></Span>
        }
      <Span text="2"></Span>
    </${textBaseElementName}>`;
  @Component({
    template,
  })
  class DynamicSpansComponent extends BaseComponent {
    show = true;
  }

  template = `<${textBaseElementName} #textBase>
      <FormattedString>
        <Span text="0"></Span>
        @if(show) {
        <Span text="1"></Span>
        }
        <Span text="2"></Span>
      </FormattedString>
    </${textBaseElementName}>`;
  @Component({
    template,
  })
  class DynamicFormattedStringComponent extends BaseComponent {
    show = true;
  }
  return {
    SpansComponent,
    DynamicSpansComponent,
    FormattedStringComponent,
    DynamicFormattedStringComponent,
  };
};

describe('Spans', () => {
  const componentsToTest = ['Label', 'TextField', 'TextView', 'Button'];
  for (const textBaseElementName of componentsToTest) {
    describe(`on ${textBaseElementName}`, () => {
      const { SpansComponent, DynamicSpansComponent, FormattedStringComponent, DynamicFormattedStringComponent } =
        configureComponents(textBaseElementName);
      beforeEach(() => {
        return TestBed.configureTestingModule({
          imports: [
            NativeScriptModule,
            SpansComponent,
            DynamicSpansComponent,
            FormattedStringComponent,
            DynamicFormattedStringComponent,
          ],
          schemas: [NO_ERRORS_SCHEMA],
        }).compileComponents();
      });
      it('correctly adds', async () => {
        const fixture = TestBed.createComponent(SpansComponent);
        fixture.detectChanges();
        const textBase = fixture.componentInstance.textBase.nativeElement;
        expect(textBase.formattedText.spans.length).toBe(3);
        expect(textBase.formattedText.spans.getItem(0).text).toBe('0');
        expect(textBase.formattedText.spans.getItem(1).text).toBe('1');
        expect(textBase.formattedText.spans.getItem(2).text).toBe('2');
      });
      it('correctly adds dynamically', async () => {
        const fixture = TestBed.createComponent(DynamicSpansComponent);
        const textBase = fixture.componentInstance.textBase.nativeElement;
        fixture.detectChanges();
        expect(textBase.formattedText.spans.length).toBe(3);
        expect(textBase.formattedText.spans.getItem(0).text).toBe('0');
        expect(textBase.formattedText.spans.getItem(1).text).toBe('1');
        expect(textBase.formattedText.spans.getItem(2).text).toBe('2');
        fixture.componentInstance.show = false;
        fixture.detectChanges();
        expect(textBase.formattedText.spans.length).toBe(2);
        expect(textBase.formattedText.spans.getItem(0).text).toBe('0');
        expect(textBase.formattedText.spans.getItem(1).text).toBe('2');
        fixture.componentInstance.show = true;
        fixture.detectChanges();
        expect(textBase.formattedText.spans.length).toBe(3);
        expect(textBase.formattedText.spans.getItem(0).text).toBe('0');
        expect(textBase.formattedText.spans.getItem(1).text).toBe('1');
        expect(textBase.formattedText.spans.getItem(2).text).toBe('2');
      });

      it('correctly adds FormattedString', async () => {
        const fixture = TestBed.createComponent(FormattedStringComponent);
        fixture.detectChanges();
        const textBase = fixture.componentInstance.textBase.nativeElement;
        expect(textBase.formattedText.spans.length).toBe(3);
        expect(textBase.formattedText.spans.getItem(0).text).toBe('0');
        expect(textBase.formattedText.spans.getItem(1).text).toBe('1');
        expect(textBase.formattedText.spans.getItem(2).text).toBe('2');
      });

      it('correctly adds FormattedString dynamically', async () => {
        const fixture = TestBed.createComponent(DynamicFormattedStringComponent);
        const textBase = fixture.componentInstance.textBase.nativeElement;
        fixture.detectChanges();
        expect(textBase.formattedText.spans.length).toBe(3);
        expect(textBase.formattedText.spans.getItem(0).text).toBe('0');
        expect(textBase.formattedText.spans.getItem(1).text).toBe('1');
        expect(textBase.formattedText.spans.getItem(2).text).toBe('2');
        fixture.componentInstance.show = false;
        fixture.detectChanges();
        expect(textBase.formattedText.spans.length).toBe(2);
        expect(textBase.formattedText.spans.getItem(0).text).toBe('0');
        expect(textBase.formattedText.spans.getItem(1).text).toBe('2');
        fixture.componentInstance.show = true;
        fixture.detectChanges();
        expect(textBase.formattedText.spans.length).toBe(3);
        expect(textBase.formattedText.spans.getItem(0).text).toBe('0');
        expect(textBase.formattedText.spans.getItem(1).text).toBe('1');
        expect(textBase.formattedText.spans.getItem(2).text).toBe('2');
      });
    });
  }
});
