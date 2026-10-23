import { Subject } from 'rxjs';

const rootView = { isLoaded: true };
class MockApplicationRef {}
jest.mock('@angular/core', () => ({ ApplicationRef: MockApplicationRef, ɵresetCompiledComponents: jest.fn() }));
jest.mock('@nativescript/core', () => ({ Application: { getRootView: () => rootView } }));
jest.mock('../trace', () => ({
  NativeScriptDebug: { isLogEnabled: () => false, hmrLog: jest.fn(), hmrLogError: jest.fn() },
}));

import { trackHmrDialog } from './dialog';
import { hmrState, runHmrHooks } from './hmr';

class DialogComponent {}
class NativeDialogToken {}

function fakeRef() {
  const closed = new Subject<void>();
  const animated = [true];
  const ref = {
    afterClosed: () => closed,
    _nativeModalRef: { parentView: { _modalAnimatedOptions: animated } },
  } as any;
  return { ref, closed, animated };
}

function fakeInjector() {
  const dialog = { open: jest.fn() };
  const appRef = { whenStable: () => Promise.resolve() };
  const tokens = new Map<unknown, unknown>([
    [NativeDialogToken, dialog],
    [MockApplicationRef, appRef],
  ]);
  return { dialog, injector: { get: (token: unknown) => tokens.get(token) ?? null } as any };
}

beforeEach(() => {
  jest.useFakeTimers();
  delete (globalThis as Record<string, unknown>).__NS_NG_HMR__;
});

afterEach(() => jest.useRealTimers());

describe('dialog restore', () => {
  it('reopens preserved dialogs once the app is stable, without animation, using the fresh class', async () => {
    const { ref, animated } = fakeRef();
    trackHmrDialog(NativeDialogToken as any, ref, DialogComponent, {
      preserveOnHmr: true,
      data: { id: 1 },
      nativeOptions: { fullscreen: true },
    } as any);
    runHmrHooks('beforeDispose', {} as any);
    expect(animated).toEqual([false]);

    class FreshDialogComponent {}
    hmrState().components.set('DialogComponent', FreshDialogComponent);
    const { dialog, injector } = fakeInjector();
    runHmrHooks('afterBootstrap', injector);
    await jest.runAllTimersAsync();

    expect(dialog.open).toHaveBeenCalledTimes(1);
    const [component, config] = dialog.open.mock.calls[0];
    expect(component).toBe(FreshDialogComponent);
    expect(config).toMatchObject({
      data: { id: 1 },
      renderIn: 'root',
      nativeOptions: { fullscreen: true, animated: false },
    });
  });

  it('ignores dialogs that did not opt in or were already closed', async () => {
    const optedOut = fakeRef();
    trackHmrDialog(NativeDialogToken as any, optedOut.ref, DialogComponent, { preserveOnHmr: false } as any);
    const closed = fakeRef();
    trackHmrDialog(NativeDialogToken as any, closed.ref, DialogComponent, { preserveOnHmr: true } as any);
    closed.closed.next();

    runHmrHooks('beforeDispose', {} as any);
    const { dialog, injector } = fakeInjector();
    runHmrHooks('afterBootstrap', injector);
    await jest.runAllTimersAsync();

    expect(dialog.open).not.toHaveBeenCalled();
  });
});
