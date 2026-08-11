import { Component, ElementRef, NgZone, NO_ERRORS_SCHEMA, ViewChild } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { EVENT_MANAGER_PLUGINS, EventManager, EventManagerPlugin } from '@angular/platform-browser';
import { NativeScriptCommonModule, NativeScriptEventManagerPlugin, NativeScriptRendererHelperService, PREVENT_CHANGE_EVENTS_DURING_CD } from '@nativescript/angular';
import { StackLayout, View } from '@nativescript/core';

describe('NativeScriptEventManagerPlugin', () => {
  it('supports every event name', () => {
    const plugin = new NativeScriptEventManagerPlugin();
    expect(plugin.supports('tap')).toBe(true);
    expect(plugin.supports('custom.debounce.500')).toBe(true);
  });

  it('attaches and detaches handlers through on/off', () => {
    const plugin = new NativeScriptEventManagerPlugin();
    const view = new StackLayout();
    let count = 0;
    const remove = plugin.addEventListener(view, 'myEvent', () => count++);
    view.notify({ eventName: 'myEvent', object: view });
    expect(count).toBe(1);
    remove();
    view.notify({ eventName: 'myEvent', object: view });
    expect(count).toBe(1);
  });

  it('replays the loaded event when the target is already loaded', () => {
    const plugin = new NativeScriptEventManagerPlugin();
    const target: any = { isLoaded: true, on() {}, off() {} };
    let fired = 0;
    plugin.addEventListener(target, View.loadedEvent, () => fired++);
    expect(fired).toBe(1);
  });

  it('does not replay the loaded event when the target is not loaded', () => {
    const plugin = new NativeScriptEventManagerPlugin();
    const target: any = { isLoaded: false, on() {}, off() {} };
    let fired = 0;
    plugin.addEventListener(target, View.loadedEvent, () => fired++);
    expect(fired).toBe(0);
  });

  it('delivers events in the zone that registered them', () => {
    const plugin = new NativeScriptEventManagerPlugin();
    const view = new StackLayout();
    let whichZone: string;
    Zone.root.fork({ name: 'registration-zone' }).run(() => {
      plugin.addEventListener(view, 'myEvent', () => (whichZone = Zone.current.name));
    });
    Zone.root.run(() => {
      view.notify({ eventName: 'myEvent', object: view });
    });
    expect(whichZone).toBe('registration-zone');
  });
});

class TestEventPlugin extends EventManagerPlugin {
  calls: string[] = [];

  constructor() {
    super(null);
  }

  supports(eventName: string): boolean {
    return eventName.startsWith('custom.');
  }

  addEventListener(element: any, eventName: string, handler: Function): Function {
    this.calls.push(eventName);
    const view = element as View;
    view.on('myCustomEvent', handler as any);
    return () => view.off('myCustomEvent', handler as any);
  }
}

@Component({
  template: `<StackLayout #el (custom.debounce.500)="hits = hits + 1" (myPlainEvent)="plainHits = plainHits + 1"></StackLayout>`,
  imports: [NativeScriptCommonModule],
  schemas: [NO_ERRORS_SCHEMA],
})
class PluginHostComponent {
  @ViewChild('el', { read: ElementRef, static: true }) el: ElementRef<View>;
  hits = 0;
  plainHits = 0;
}

describe('EVENT_MANAGER_PLUGINS integration', () => {
  let testPlugin: TestEventPlugin;

  beforeEach(() => {
    testPlugin = new TestEventPlugin();
    return TestBed.configureTestingModule({
      imports: [PluginHostComponent],
      providers: [{ provide: EVENT_MANAGER_PLUGINS, useValue: testPlugin, multi: true }],
    }).compileComponents();
  });

  it('provides an EventManager bound to the app NgZone', () => {
    expect(TestBed.inject(EventManager).getZone()).toBe(TestBed.inject(NgZone));
  });

  it('registers the NativeScript plugin as the default fallback', () => {
    const plugins = TestBed.inject(EVENT_MANAGER_PLUGINS);
    expect(plugins.some((p) => p instanceof NativeScriptEventManagerPlugin)).toBe(true);
  });

  it('routes sugared event names to the custom plugin', () => {
    const fixture = TestBed.createComponent(PluginHostComponent);
    fixture.detectChanges();
    expect(testPlugin.calls).toContain('custom.debounce.500');

    const view = fixture.componentInstance.el.nativeElement;
    view.notify({ eventName: 'myCustomEvent', object: view });
    expect(fixture.componentInstance.hits).toBe(1);
  });

  it('routes plain events through the NativeScript fallback plugin', () => {
    const fixture = TestBed.createComponent(PluginHostComponent);
    fixture.detectChanges();
    expect(testPlugin.calls).not.toContain('myPlainEvent');

    const view = fixture.componentInstance.el.nativeElement;
    view.notify({ eventName: 'myPlainEvent', object: view });
    expect(fixture.componentInstance.plainHits).toBe(1);
  });

  it('stops delivering events after the listener is removed', () => {
    const fixture = TestBed.createComponent(PluginHostComponent);
    fixture.detectChanges();
    const view = fixture.componentInstance.el.nativeElement;
    fixture.destroy();
    view.notify({ eventName: 'myCustomEvent', object: view });
    view.notify({ eventName: 'myPlainEvent', object: view });
    expect(fixture.componentInstance.hits).toBe(0);
    expect(fixture.componentInstance.plainHits).toBe(0);
  });
});

@Component({
  template: `<StackLayout #el (somePropChange)="changes = changes + 1"></StackLayout>`,
  imports: [NativeScriptCommonModule],
  schemas: [NO_ERRORS_SCHEMA],
})
class ChangeEventHostComponent {
  @ViewChild('el', { read: ElementRef, static: true }) el: ElementRef<View>;
  changes = 0;
}

describe('prevent change events during CD', () => {
  beforeEach(() => {
    return TestBed.configureTestingModule({
      imports: [ChangeEventHostComponent],
      providers: [{ provide: PREVENT_CHANGE_EVENTS_DURING_CD, useValue: true }],
    }).compileComponents();
  });

  it('suppresses *Change events while DOM changes are executing', () => {
    const fixture = TestBed.createComponent(ChangeEventHostComponent);
    fixture.detectChanges();
    const view = fixture.componentInstance.el.nativeElement;
    const helper = TestBed.inject(NativeScriptRendererHelperService);

    helper.beginDomChanges();
    view.notify({ eventName: 'somePropChange', object: view });
    helper.endDomChanges();
    expect(fixture.componentInstance.changes).toBe(0);

    view.notify({ eventName: 'somePropChange', object: view });
    expect(fixture.componentInstance.changes).toBe(1);
  });
});
