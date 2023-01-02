import { Component, ElementRef, NO_ERRORS_SCHEMA, ViewChild } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { NativeScriptModule } from '@nativescript/angular';
import { TextBase } from '@nativescript/core';

const configureComponents = (textBaseElementName: string) => {
  class BaseComponent {
    @ViewChild('textBase', { static: true }) textBase: ElementRef<TextBase>;
  }

  @Component({
    template: `<${textBaseElementName} #textBase>
      <Span text="0"></Span>
      <Span text="1"></Span>
      <Span text="2"></Span>
    </${textBaseElementName}>`,
  })
  class SpansComponent extends BaseComponent {}

  @Component({
    template: `<${textBaseElementName} #textBase>
      <FormattedString>
        <Span text="0"></Span>
        <Span text="1"></Span>
        <Span text="2"></Span>
      </FormattedString>
    </${textBaseElementName}>`,
  })
  class FormattedStringComponent extends BaseComponent {}

  @Component({
    template: `<${textBaseElementName} #textBase>
      <Span text="0"></Span>
      <Span *ngIf="show" text="1"></Span>
      <Span text="2"></Span>
    </${textBaseElementName}>`,
  })
  class DynamicSpansComponent extends BaseComponent {
    show = true;
  }

  @Component({
    template: `<${textBaseElementName} #textBase>
      <FormattedString>
        <Span text="0"></Span>
        <Span *ngIf="show"  text="1"></Span>
        <Span text="2"></Span>
      </FormattedString>
    </${textBaseElementName}>`,
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
      const { SpansComponent, DynamicSpansComponent, FormattedStringComponent, DynamicFormattedStringComponent } = configureComponents(textBaseElementName);
      beforeEach(() => {
        return TestBed.configureTestingModule({
          declarations: [SpansComponent, DynamicSpansComponent, FormattedStringComponent, DynamicFormattedStringComponent],
          imports: [NativeScriptModule],
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
