import { Component, Input, input } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { RoutedComponentInputBinder } from '@nativescript/angular/lib/legacy/router/router-component-input-binder';
import type { PageRouterOutlet } from '@nativescript/angular/lib/legacy/router/page-router-outlet';

@Component({ template: '', standalone: true })
class TestComponent {
  @Input() name: string;
  @Input() id: string;
  @Input() language: string;
}

@Component({ template: '', standalone: true })
class SignalInputComponent {
  name = input<string>();
  id = input<string>();
}

function createMockOutlet(
  component: any,
  options?: {
    params?: Record<string, string>;
    queryParams?: Record<string, string>;
    data?: Record<string, any>;
  },
) {
  const params$ = new BehaviorSubject(options?.params ?? {});
  const queryParams$ = new BehaviorSubject(options?.queryParams ?? {});
  const data$ = new BehaviorSubject(options?.data ?? {});

  const setInputSpy = jasmine.createSpy('setInput');
  const activatedRoute = {
    params: params$.asObservable(),
    queryParams: queryParams$.asObservable(),
    data: data$.asObservable(),
    component,
  };

  const outlet = {
    isActivated: true,
    activatedRoute,
    activatedComponentRef: { setInput: setInputSpy },
  } as unknown as PageRouterOutlet;

  return { outlet, params$, queryParams$, data$, setInputSpy, activatedRoute };
}

describe('RoutedComponentInputBinder', () => {
  it('binds route params to component inputs', () => {
    const binder = new RoutedComponentInputBinder({ queryParams: true });
    const { outlet, setInputSpy } = createMockOutlet(TestComponent, {
      params: { name: 'test-name' },
    });

    binder.bindActivatedRouteToOutletComponent(outlet);

    expect(setInputSpy).toHaveBeenCalledWith('name', 'test-name');
  });

  it('binds query params to component inputs', () => {
    const binder = new RoutedComponentInputBinder({ queryParams: true });
    const { outlet, setInputSpy } = createMockOutlet(TestComponent, {
      queryParams: { id: '42' },
    });

    binder.bindActivatedRouteToOutletComponent(outlet);

    expect(setInputSpy).toHaveBeenCalledWith('id', '42');
  });

  it('binds route data to component inputs', () => {
    const binder = new RoutedComponentInputBinder({ queryParams: true });
    const { outlet, setInputSpy } = createMockOutlet(TestComponent, {
      data: { name: 'from-data' },
    });

    binder.bindActivatedRouteToOutletComponent(outlet);

    expect(setInputSpy).toHaveBeenCalledWith('name', 'from-data');
  });

  it('data takes priority over params, params over queryParams', () => {
    const binder = new RoutedComponentInputBinder({ queryParams: true });
    const { outlet, setInputSpy } = createMockOutlet(TestComponent, {
      queryParams: { name: 'from-query' },
      params: { name: 'from-params' },
      data: { name: 'from-data' },
    });

    binder.bindActivatedRouteToOutletComponent(outlet);

    const nameCall = setInputSpy.calls.allArgs().find((args: any[]) => args[0] === 'name');
    expect(nameCall[1]).toBe('from-data');
  });

  it('params take priority over queryParams', () => {
    const binder = new RoutedComponentInputBinder({ queryParams: true });
    const { outlet, setInputSpy } = createMockOutlet(TestComponent, {
      queryParams: { name: 'from-query' },
      params: { name: 'from-params' },
    });

    binder.bindActivatedRouteToOutletComponent(outlet);

    const nameCall = setInputSpy.calls.allArgs().find((args: any[]) => args[0] === 'name');
    expect(nameCall[1]).toBe('from-params');
  });

  it('does not bind query params when queryParams option is false', () => {
    const binder = new RoutedComponentInputBinder({ queryParams: false });
    const { outlet, setInputSpy } = createMockOutlet(TestComponent, {
      queryParams: { name: 'from-query' },
    });

    binder.bindActivatedRouteToOutletComponent(outlet);

    const nameCall = setInputSpy.calls.allArgs().find((args: any[]) => args[0] === 'name');
    expect(nameCall[1]).toBeUndefined();
  });

  it('sets unmatched inputs to undefined with alwaysUndefined behavior (default)', () => {
    const binder = new RoutedComponentInputBinder({});
    const { outlet, setInputSpy } = createMockOutlet(TestComponent, {
      params: { name: 'test' },
    });

    binder.bindActivatedRouteToOutletComponent(outlet);

    const idCall = setInputSpy.calls.allArgs().find((args: any[]) => args[0] === 'id');
    expect(idCall).toBeTruthy();
    expect(idCall[1]).toBeUndefined();
  });

  it('does not set unmatched inputs with undefinedIfStale when key was never seen', () => {
    const binder = new RoutedComponentInputBinder({ unmatchedInputBehavior: 'undefinedIfStale' });
    const { outlet, setInputSpy } = createMockOutlet(TestComponent, {
      params: { name: 'test' },
    });

    binder.bindActivatedRouteToOutletComponent(outlet);

    const idCall = setInputSpy.calls.allArgs().find((args: any[]) => args[0] === 'id');
    expect(idCall).toBeUndefined();
  });

  it('sets previously seen keys to undefined with undefinedIfStale behavior', async () => {
    const binder = new RoutedComponentInputBinder({ unmatchedInputBehavior: 'undefinedIfStale' });
    const { outlet, setInputSpy, params$ } = createMockOutlet(TestComponent, {
      params: { name: 'test', id: '1' },
    });

    binder.bindActivatedRouteToOutletComponent(outlet);

    const idCallBefore = setInputSpy.calls.allArgs().find((args: any[]) => args[0] === 'id');
    expect(idCallBefore[1]).toBe('1');

    setInputSpy.calls.reset();
    params$.next({ name: 'test' });
    await Promise.resolve();

    const idCallAfter = setInputSpy.calls.allArgs().find((args: any[]) => args[0] === 'id');
    expect(idCallAfter).toBeTruthy();
    expect(idCallAfter[1]).toBeUndefined();
  });

  it('reacts to param changes', async () => {
    const binder = new RoutedComponentInputBinder({});
    const { outlet, setInputSpy, params$ } = createMockOutlet(TestComponent, {
      params: { name: 'initial' },
    });

    binder.bindActivatedRouteToOutletComponent(outlet);
    expect(setInputSpy).toHaveBeenCalledWith('name', 'initial');

    setInputSpy.calls.reset();
    params$.next({ name: 'updated' });
    await Promise.resolve();

    expect(setInputSpy).toHaveBeenCalledWith('name', 'updated');
  });

  it('unsubscribes from route data', () => {
    const binder = new RoutedComponentInputBinder({});
    const { outlet, setInputSpy, params$ } = createMockOutlet(TestComponent, {
      params: { name: 'test' },
    });

    binder.bindActivatedRouteToOutletComponent(outlet);
    setInputSpy.calls.reset();

    binder.unsubscribeFromRouteData(outlet);
    params$.next({ name: 'after-unsub' });

    expect(setInputSpy).not.toHaveBeenCalled();
  });

  it('re-subscribes when bindActivatedRouteToOutletComponent is called again', () => {
    const binder = new RoutedComponentInputBinder({});
    const { outlet, setInputSpy, params$ } = createMockOutlet(TestComponent, {
      params: { name: 'first' },
    });

    binder.bindActivatedRouteToOutletComponent(outlet);
    setInputSpy.calls.reset();

    params$.next({ name: 'second' });
    binder.bindActivatedRouteToOutletComponent(outlet);

    const nameCall = setInputSpy.calls.allArgs().find((args: any[]) => args[0] === 'name');
    expect(nameCall[1]).toBe('second');
  });

  it('unsubscribes when outlet is deactivated mid-stream', async () => {
    const binder = new RoutedComponentInputBinder({});
    const { outlet, setInputSpy, params$ } = createMockOutlet(TestComponent, {
      params: { name: 'test' },
    });

    binder.bindActivatedRouteToOutletComponent(outlet);
    setInputSpy.calls.reset();

    (outlet as any).isActivated = false;
    params$.next({ name: 'after-deactivate' });
    await Promise.resolve();

    expect(setInputSpy).not.toHaveBeenCalledWith('name', 'after-deactivate');
  });

  it('works with signal inputs', () => {
    const binder = new RoutedComponentInputBinder({});
    const { outlet, setInputSpy } = createMockOutlet(SignalInputComponent, {
      params: { name: 'signal-test' },
    });

    binder.bindActivatedRouteToOutletComponent(outlet);

    expect(setInputSpy).toHaveBeenCalledWith('name', 'signal-test');
  });

  it('combines values from all sources', () => {
    const binder = new RoutedComponentInputBinder({ queryParams: true });
    const { outlet, setInputSpy } = createMockOutlet(TestComponent, {
      queryParams: { language: 'en' },
      params: { name: 'test-name' },
      data: { id: 'data-id' },
    });

    binder.bindActivatedRouteToOutletComponent(outlet);

    expect(setInputSpy).toHaveBeenCalledWith('name', 'test-name');
    expect(setInputSpy).toHaveBeenCalledWith('id', 'data-id');
    expect(setInputSpy).toHaveBeenCalledWith('language', 'en');
  });
});
