import { Component, ElementRef, inject, NO_ERRORS_SCHEMA, Renderer2, signal, ViewChild } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import {
  DEFER_NATIVE_OPS_DURING_CD,
  NativeScriptCommonModule,
  NativeScriptRendererFactory,
  NativeScriptRendererHelperService,
  registerElement,
} from '@nativescript/angular';
import {
  Button,
  ContentView,
  GridLayout,
  Label,
  LayoutBase,
  ProxyViewContainer,
  StackLayout,
  TextField,
  View,
} from '@nativescript/core';
import { dumpView } from './test-utils.spec';

function childCount(view: View): number {
  return (view as LayoutBase).getChildrenCount();
}
function childAt(view: View, index: number): View {
  return (view as LayoutBase).getChildAt(index);
}

// ---------------------------------------------------------------------------
// Low-level renderer behavior. We drive the public renderer API exactly the way
// Angular does (factory.begin()/end() bracket a change-detection pass), so these
// exercise the real deferral path without depending on Angular's internals.
// ---------------------------------------------------------------------------
describe('NativeScriptRenderer deferred native ops (enabled)', () => {
  let factory: NativeScriptRendererFactory;
  let helper: NativeScriptRendererHelperService;
  let renderer: Renderer2;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [{ provide: DEFER_NATIVE_OPS_DURING_CD, useValue: true }],
      schemas: [NO_ERRORS_SCHEMA],
    });
    factory = TestBed.inject(NativeScriptRendererFactory);
    helper = TestBed.inject(NativeScriptRendererHelperService);
    renderer = factory.createRenderer(null, null);
  });

  it('begin()/end() toggle the deferral window when the token is enabled', () => {
    expect(helper.deferral.deferring).toBe(false);
    factory.begin();
    expect(helper.deferral.deferring).toBe(true);
    factory.end();
    expect(helper.deferral.deferring).toBe(false);
  });

  it('defers the native attach until end() but keeps the logical tree synchronous', () => {
    factory.begin();
    const parent = renderer.createElement('StackLayout') as View;
    const child = renderer.createElement('Button') as View;
    renderer.appendChild(parent, child);

    // Native tree is untouched mid-CD...
    expect(childCount(parent)).toBe(0);
    // ...but Angular can still read the logical tree back synchronously.
    expect(renderer.parentNode(child)).toBe(parent);

    factory.end();

    expect(childCount(parent)).toBe(1);
    expect(childAt(parent, 0)).toBe(child);
  });

  it('never attaches a view created and removed within the same CD pass', () => {
    factory.begin();
    const parent = renderer.createElement('StackLayout') as View;
    const child = renderer.createElement('Button') as View;
    renderer.appendChild(parent, child);
    renderer.removeChild(parent, child);
    factory.end();

    expect(childCount(parent)).toBe(0);
    expect(child.parent).toBeFalsy();
  });

  it('inserts deferred children at the correct position among existing children', () => {
    // First pass: attach the anchors a and d.
    factory.begin();
    const parent = renderer.createElement('StackLayout') as View;
    const a = renderer.createElement('Label') as View;
    const d = renderer.createElement('Label') as View;
    renderer.appendChild(parent, a);
    renderer.appendChild(parent, d);
    factory.end();
    expect(childCount(parent)).toBe(2);

    // Second pass: insert b and c between a and d. The flush must place them
    // correctly even though their anchor (each other / d) is also pending.
    factory.begin();
    const b = renderer.createElement('Label') as View;
    const c = renderer.createElement('Label') as View;
    renderer.insertBefore(parent, b, d);
    renderer.insertBefore(parent, c, d);
    // Native order is still just [a, d] until end().
    expect(childCount(parent)).toBe(2);
    factory.end();

    expect(childCount(parent)).toBe(4);
    expect(childAt(parent, 0)).toBe(a);
    expect(childAt(parent, 1)).toBe(b);
    expect(childAt(parent, 2)).toBe(c);
    expect(childAt(parent, 3)).toBe(d);
  });

  it('attaches to the final parent when a view is moved within a CD pass', () => {
    factory.begin();
    const parentA = renderer.createElement('StackLayout') as View;
    const parentB = renderer.createElement('StackLayout') as View;
    const child = renderer.createElement('Button') as View;
    renderer.appendChild(parentA, child);
    renderer.appendChild(parentB, child); // move before anything was attached
    factory.end();

    expect(childCount(parentA)).toBe(0);
    expect(childCount(parentB)).toBe(1);
    expect(childAt(parentB, 0)).toBe(child);
  });

  it('defers property, style and class writes until end()', () => {
    factory.begin();
    const label = renderer.createElement('Label') as Label;
    renderer.setProperty(label, 'text', 'hello');
    renderer.setStyle(label, 'color', 'red');
    renderer.addClass(label, 'foo');

    expect(label.text).not.toBe('hello');
    expect(label.style.color).toBeFalsy();
    expect(label.className).toBeFalsy();

    factory.end();

    expect(label.text).toBe('hello');
    expect(label.style.color).toBeTruthy();
    expect(label.className).toBe('foo');
  });

  it('coalesces repeated writes within a CD pass to the final value', () => {
    factory.begin();
    const label = renderer.createElement('Label') as Label;
    renderer.setProperty(label, 'text', 'first');
    renderer.setProperty(label, 'text', 'second');
    renderer.addClass(label, 'a');
    renderer.addClass(label, 'b');
    renderer.removeClass(label, 'a');
    factory.end();

    expect(label.text).toBe('second');
    expect(label.className).toBe('b');
  });

  it('flushes leftovers from a CD pass that threw before end()', () => {
    factory.begin();
    const parent = renderer.createElement('StackLayout') as View;
    const child = renderer.createElement('Button') as View;
    renderer.appendChild(parent, child);
    // Simulate a tick that threw between begin() and end(): end() is never
    // called. The next begin() must apply the leftovers instead of losing them.
    factory.begin();

    expect(childCount(parent)).toBe(1);
    expect(childAt(parent, 0)).toBe(child);
    factory.end();
  });
});

describe('NativeScriptRenderer deferred native ops (disabled by default)', () => {
  let factory: NativeScriptRendererFactory;
  let helper: NativeScriptRendererHelperService;
  let renderer: Renderer2;

  beforeEach(() => {
    TestBed.configureTestingModule({ schemas: [NO_ERRORS_SCHEMA] });
    factory = TestBed.inject(NativeScriptRendererFactory);
    helper = TestBed.inject(NativeScriptRendererHelperService);
    renderer = factory.createRenderer(null, null);
  });

  it('does not open a deferral window', () => {
    factory.begin();
    expect(helper.deferral.deferring).toBe(false);
    factory.end();
  });

  it('applies native operations immediately', () => {
    factory.begin();
    const parent = renderer.createElement('StackLayout') as View;
    const child = renderer.createElement('Button') as View;
    renderer.appendChild(parent, child);
    const label = renderer.createElement('Label') as Label;
    renderer.setProperty(label, 'text', 'hello');

    // No deferral: everything is applied as it happens.
    expect(childCount(parent)).toBe(1);
    expect(label.text).toBe('hello');
    factory.end();
  });
});

// ---------------------------------------------------------------------------
// End-to-end: drive real Angular change detection (built-in control flow) with
// the feature enabled and assert the rendered native tree is correct. These
// cover what the renderer-level tests can't: Angular reusing and *moving* views
// (@for with track), nested structure, and property/class bindings.
// ---------------------------------------------------------------------------
interface Item {
  id: number;
  text: string;
}

// Components use signals so that, in the zoneless test harness, model changes
// reliably mark the consuming views dirty and are picked up by detectChanges().
@Component({
  selector: 'if-comp',
  template: `<StackLayout #sl>
    @if (show()) {
      <Label text="If"></Label>
    } @else {
      <Label text="Else"></Label>
    }
  </StackLayout>`,
  imports: [NativeScriptCommonModule],
  schemas: [NO_ERRORS_SCHEMA],
})
class IfComp {
  @ViewChild('sl', { static: true }) sl: ElementRef<StackLayout>;
  show = signal(true);
}

@Component({
  selector: 'for-comp',
  template: `<StackLayout #sl>
    @for (item of items(); track item.id) {
      <Label [text]="item.text" [class.selected]="item.id === selectedId()"></Label>
    }
  </StackLayout>`,
  imports: [NativeScriptCommonModule],
  schemas: [NO_ERRORS_SCHEMA],
})
class ForComp {
  @ViewChild('sl', { static: true }) sl: ElementRef<StackLayout>;
  items = signal<Item[]>([
    { id: 1, text: 'a' },
    { id: 2, text: 'b' },
    { id: 3, text: 'c' },
  ]);
  selectedId = signal(-1);
}

@Component({
  selector: 'nested-comp',
  template: `<StackLayout #sl>
    @for (group of groups(); track group) {
      <StackLayout>
        @for (item of group; track item) {
          <Label [text]="item"></Label>
        }
      </StackLayout>
    }
  </StackLayout>`,
  imports: [NativeScriptCommonModule],
  schemas: [NO_ERRORS_SCHEMA],
})
class NestedComp {
  @ViewChild('sl', { static: true }) sl: ElementRef<StackLayout>;
  groups = signal<string[][]>([
    ['a', 'b'],
    ['c', 'd'],
  ]);
}

describe('NativeScriptRenderer rendering under deferral (Angular control flow)', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [IfComp, ForComp, NestedComp],
      providers: [{ provide: DEFER_NATIVE_OPS_DURING_CD, useValue: true }],
    });
  });

  it('renders @if / @else and swaps branches across change detection', () => {
    const fixture: ComponentFixture<IfComp> = TestBed.createComponent(IfComp);
    fixture.detectChanges();
    const root = fixture.componentInstance.sl.nativeElement;
    expect(dumpView(root, true)).toBe('(stacklayout (label[text=If]))');

    fixture.componentInstance.show.set(false);
    fixture.detectChanges();
    expect(dumpView(root, true)).toBe('(stacklayout (label[text=Else]))');

    fixture.componentInstance.show.set(true);
    fixture.detectChanges();
    expect(dumpView(root, true)).toBe('(stacklayout (label[text=If]))');
  });

  it('renders a tracked @for', () => {
    const fixture: ComponentFixture<ForComp> = TestBed.createComponent(ForComp);
    fixture.detectChanges();
    const root = fixture.componentInstance.sl.nativeElement;
    expect(dumpView(root, true)).toBe(
      '(stacklayout (label[text=a]), (label[text=b]), (label[text=c]))',
    );
  });

  it('inserts a @for item at the correct position', () => {
    const fixture: ComponentFixture<ForComp> = TestBed.createComponent(ForComp);
    const component = fixture.componentInstance;
    fixture.detectChanges();
    const root = component.sl.nativeElement;

    const current = component.items();
    component.items.set([current[0], { id: 4, text: 'x' }, ...current.slice(1)]);
    fixture.detectChanges();
    expect(dumpView(root, true)).toBe(
      '(stacklayout (label[text=a]), (label[text=x]), (label[text=b]), (label[text=c]))',
    );
  });

  it('removes a @for item', () => {
    const fixture: ComponentFixture<ForComp> = TestBed.createComponent(ForComp);
    const component = fixture.componentInstance;
    fixture.detectChanges();
    const root = component.sl.nativeElement;

    const current = component.items();
    component.items.set([current[0], current[2]]); // drop id 2 ('b')
    fixture.detectChanges();
    expect(dumpView(root, true)).toBe('(stacklayout (label[text=a]), (label[text=c]))');
  });

  it('reorders @for items by moving the tracked views', () => {
    const fixture: ComponentFixture<ForComp> = TestBed.createComponent(ForComp);
    const component = fixture.componentInstance;
    fixture.detectChanges();
    const root = component.sl.nativeElement;
    const before = component.sl.nativeElement.getChildAt(0);

    // Reverse the list. Because we track by id, Angular reuses the existing
    // Label views and *moves* them, which goes through removeChild + insertBefore
    // in the renderer -- the case the deferral flush has to order correctly.
    component.items.set([...component.items()].reverse());
    fixture.detectChanges();
    expect(dumpView(root, true)).toBe(
      '(stacklayout (label[text=c]), (label[text=b]), (label[text=a]))',
    );
    // The 'a' view instance was reused, just moved to the end.
    expect(component.sl.nativeElement.getChildAt(2)).toBe(before);
  });

  it('applies a [class] binding that changes across change detection', () => {
    const fixture: ComponentFixture<ForComp> = TestBed.createComponent(ForComp);
    const component = fixture.componentInstance;
    fixture.detectChanges();
    const root = component.sl.nativeElement;

    component.selectedId.set(2);
    fixture.detectChanges();
    expect((root.getChildAt(0) as Label).className || '').not.toContain('selected');
    expect((root.getChildAt(1) as Label).className).toContain('selected');
  });

  it('renders nested @for blocks and reflects updates', () => {
    const fixture: ComponentFixture<NestedComp> = TestBed.createComponent(NestedComp);
    const component = fixture.componentInstance;
    fixture.detectChanges();
    const root = component.sl.nativeElement;
    expect(dumpView(root, true)).toBe(
      '(stacklayout ' +
        '(stacklayout (label[text=a]), (label[text=b])), ' +
        '(stacklayout (label[text=c]), (label[text=d])))',
    );

    component.groups.set([...component.groups(), ['e']]);
    fixture.detectChanges();
    expect(dumpView(root, true)).toBe(
      '(stacklayout ' +
        '(stacklayout (label[text=a]), (label[text=b])), ' +
        '(stacklayout (label[text=c]), (label[text=d])), ' +
        '(stacklayout (label[text=e])))',
    );
  });
});

// ---------------------------------------------------------------------------
// Renderer.createElement (ported from the original suite)
// ---------------------------------------------------------------------------
describe('NativeScriptRenderer createElement', () => {
  let renderer: Renderer2;
  beforeEach(() => {
    TestBed.configureTestingModule({ schemas: [NO_ERRORS_SCHEMA] });
    renderer = TestBed.inject(NativeScriptRendererFactory).createRenderer(null, null);
  });

  it('creates an element from CamelCase', () => {
    expect(renderer.createElement('StackLayout') instanceof StackLayout).toBe(true);
  });
  it('creates an element from lowercase', () => {
    expect(renderer.createElement('stacklayout') instanceof StackLayout).toBe(true);
  });
  it('creates an element from kebab-case', () => {
    expect(renderer.createElement('stack-layout') instanceof StackLayout).toBe(true);
  });
  it('creates a ProxyViewContainer for an unknown tag', () => {
    expect(renderer.createElement('unknown-tag') instanceof ProxyViewContainer).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Renderer attach/detach (ported from the original suite)
// ---------------------------------------------------------------------------
describe('NativeScriptRenderer attach/detach', () => {
  let renderer: Renderer2;
  beforeEach(() => {
    TestBed.configureTestingModule({ schemas: [NO_ERRORS_SCHEMA] });
    renderer = TestBed.inject(NativeScriptRendererFactory).createRenderer(null, null);
  });

  it('attaches a child to a ContentView', () => {
    const parent = renderer.createElement('ContentView') as ContentView;
    const button = renderer.createElement('Button') as Button;
    renderer.appendChild(parent, button);
    expect(parent.content).toBe(button);
    expect(button.parent).toBe(parent);
  });

  it('attaches a child to a layout', () => {
    const parent = renderer.createElement('StackLayout') as StackLayout;
    const button = renderer.createElement('Button') as Button;
    renderer.appendChild(parent, button);
    expect(parent.getChildAt(0)).toBe(button);
    expect(button.parent).toBe(parent);
  });

  it('detaches a child from a ContentView', () => {
    const parent = renderer.createElement('ContentView') as ContentView;
    const button = renderer.createElement('Button') as Button;
    renderer.appendChild(parent, button);
    renderer.removeChild(parent, button);
    expect(parent.content).toBeFalsy();
    expect(button.parent).toBeFalsy();
  });

  it('detaches a child from a layout', () => {
    const parent = renderer.createElement('StackLayout') as StackLayout;
    const button = renderer.createElement('Button') as Button;
    renderer.appendChild(parent, button);
    renderer.removeChild(parent, button);
    expect(parent.getChildrenCount()).toBe(0);
    expect(button.parent).toBeFalsy();
  });
});

// ---------------------------------------------------------------------------
// Renderer.listen (ported; the original asserted NgZone, which is a no-op zone
// in this harness, so we assert the functional contract instead).
// ---------------------------------------------------------------------------
describe('NativeScriptRenderer listen', () => {
  let renderer: Renderer2;
  beforeEach(() => {
    TestBed.configureTestingModule({ schemas: [NO_ERRORS_SCHEMA] });
    renderer = TestBed.inject(NativeScriptRendererFactory).createRenderer(null, null);
  });

  it('invokes the callback on the event and stops after the returned disposer runs', () => {
    const view = renderer.createElement('StackLayout') as View;
    let calls = 0;
    // A plain (non-gesture) event so notify() drives it directly.
    const dispose = renderer.listen(view, 'someEvent', () => {
      calls++;
    });
    view.notify({ eventName: 'someEvent', object: view });
    expect(calls).toBe(1);

    dispose();
    view.notify({ eventName: 'someEvent', object: view });
    expect(calls).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// Component structure, projection and styles (ported & modernized to
// standalone components). These run with the feature in its default (off)
// state -- they verify general renderer behavior is unchanged.
// ---------------------------------------------------------------------------
@Component({
  selector: 'layout-with-label',
  template: `<StackLayout><Label text="Layout"></Label></StackLayout>`,
  imports: [NativeScriptCommonModule],
  schemas: [NO_ERRORS_SCHEMA],
})
class LayoutWithLabel {
  elementRef = inject(ElementRef);
}

@Component({
  selector: 'label-cmp',
  template: `<Label text="Layout"></Label>`,
  imports: [NativeScriptCommonModule],
  schemas: [NO_ERRORS_SCHEMA],
})
class LabelCmp {}

@Component({
  selector: 'label-container',
  template: `<GridLayout><label-cmp></label-cmp></GridLayout>`,
  imports: [NativeScriptCommonModule, LabelCmp],
  schemas: [NO_ERRORS_SCHEMA],
})
class LabelContainer {
  elementRef = inject(ElementRef);
}

@Component({
  selector: 'projectable-cmp',
  template: `<StackLayout><ng-content></ng-content></StackLayout>`,
  imports: [NativeScriptCommonModule],
  schemas: [NO_ERRORS_SCHEMA],
})
class ProjectableCmp {}

@Component({
  selector: 'projection-container',
  template: `<GridLayout><projectable-cmp><Button text="projected"></Button></projectable-cmp></GridLayout>`,
  imports: [NativeScriptCommonModule, ProjectableCmp],
  schemas: [NO_ERRORS_SCHEMA],
})
class ProjectionContainer {
  elementRef = inject(ElementRef);
}

describe('NativeScriptRenderer component structure', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [LayoutWithLabel, LabelContainer, ProjectionContainer],
      schemas: [NO_ERRORS_SCHEMA],
    });
  });

  it('renders a component with a layout', () => {
    const fixture = TestBed.createComponent(LayoutWithLabel);
    fixture.detectChanges();
    expect(dumpView(fixture.componentInstance.elementRef.nativeElement)).toBe(
      '(proxyviewcontainer (stacklayout (label)))',
    );
  });

  it('renders a component without a layout', () => {
    const fixture = TestBed.createComponent(LabelContainer);
    fixture.detectChanges();
    expect(dumpView(fixture.componentInstance.elementRef.nativeElement)).toBe(
      '(proxyviewcontainer (gridlayout (proxyviewcontainer (label))))',
    );
  });

  it('projects content into a component', () => {
    const fixture = TestBed.createComponent(ProjectionContainer);
    fixture.detectChanges();
    expect(dumpView(fixture.componentInstance.elementRef.nativeElement)).toBe(
      '(proxyviewcontainer (gridlayout (proxyviewcontainer (stacklayout (button)))))',
    );
  });
});

@Component({
  selector: 'styled-label',
  styles: ['Label { color: red; }'],
  template: `<Label text="Styled!"></Label>`,
  imports: [NativeScriptCommonModule],
  schemas: [NO_ERRORS_SCHEMA],
})
class StyledLabelCmp {
  elementRef = inject(ElementRef);
}

@Component({
  selector: 'host-styled',
  styles: [`Label { color: blue; } :host Label { color: red; }`],
  template: `<Label text="Styled!"></Label>`,
  imports: [NativeScriptCommonModule],
  schemas: [NO_ERRORS_SCHEMA],
})
class HostStyledCmp {}

@Component({
  selector: 'host-styled-parent',
  template: `<host-styled></host-styled><host-styled></host-styled>`,
  imports: [NativeScriptCommonModule, HostStyledCmp],
  schemas: [NO_ERRORS_SCHEMA],
})
class HostStyledParentCmp {
  elementRef = inject(ElementRef);
}

@Component({
  selector: 'styled-label2',
  styles: ['Label { color: red; }', `StackLayout { color: brown; } TextField { color: red; background-color: lime; }`],
  template: `<StackLayout orientation="horizontal">
    <Label text="Styled!"></Label>
    <TextField text="Styled too!"></TextField>
  </StackLayout>`,
  imports: [NativeScriptCommonModule],
  schemas: [NO_ERRORS_SCHEMA],
})
class StyledLabelCmp2 {
  elementRef = inject(ElementRef);
}

describe('NativeScriptRenderer component styles', () => {
  const RED = '#FF0000';
  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [StyledLabelCmp, HostStyledParentCmp, StyledLabelCmp2],
      schemas: [NO_ERRORS_SCHEMA],
    });
  });

  it('applies component styles from a single source', () => {
    const fixture = TestBed.createComponent(StyledLabelCmp);
    fixture.detectChanges();
    const host = fixture.componentInstance.elementRef.nativeElement as ProxyViewContainer;
    const label = host.getChildAt(0) as Label;
    expect(label.style.color.hex).toBe(RED);
  });

  it('applies component :host styles', () => {
    const fixture = TestBed.createComponent(HostStyledParentCmp);
    fixture.detectChanges();
    const host = fixture.componentInstance.elementRef.nativeElement as ProxyViewContainer;
    for (let i = 0; i < 2; i++) {
      const child = host.getChildAt(i) as ProxyViewContainer;
      const label = child.getChildAt(0) as Label;
      expect(label.style.color.hex).toBe(RED);
    }
  });

  it('applies component styles from multiple sources', () => {
    const fixture = TestBed.createComponent(StyledLabelCmp2);
    fixture.detectChanges();
    const host = fixture.componentInstance.elementRef.nativeElement as ProxyViewContainer;
    const layout = host.getChildAt(0) as LayoutBase;
    const label = layout.getChildAt(0) as Label;
    const textField = layout.getChildAt(1) as TextField;
    expect(label.style.color.hex).toBe(RED);
    expect(textField.style.color.hex).toBe(RED);
  });
});

// ---------------------------------------------------------------------------
// View loading: with deferral enabled, a freshly attached view must still load
// exactly once (the feature batches the attach, it must not duplicate it).
// ---------------------------------------------------------------------------
class CounterLabel extends Label {
  loadedCount = 0;
  onLoaded() {
    this.loadedCount++;
    super.onLoaded();
  }
}
registerElement('CounterLabel', () => CounterLabel);

@Component({
  selector: 'loads-once',
  template: `<StackLayout><CounterLabel #c text="hi"></CounterLabel></StackLayout>`,
  imports: [NativeScriptCommonModule],
  schemas: [NO_ERRORS_SCHEMA],
})
class LoadsOnceComp {
  @ViewChild('c', { static: true, read: ElementRef }) c: ElementRef<CounterLabel>;
}

describe('NativeScriptRenderer view loading (deferral enabled)', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [LoadsOnceComp],
      providers: [{ provide: DEFER_NATIVE_OPS_DURING_CD, useValue: true }],
    });
  });

  it('loads a newly attached view exactly once', async () => {
    const fixture = TestBed.createComponent(LoadsOnceComp);
    fixture.detectChanges();
    await fixture.whenRenderingDone();
    expect(fixture.componentInstance.c.nativeElement.loadedCount).toBe(1);
  });
});
