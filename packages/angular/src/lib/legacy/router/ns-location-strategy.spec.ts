jest.mock('@angular/common', () => ({
  LocationStrategy: class {},
}));

jest.mock('@angular/core', () => ({
  Inject: () => () => undefined,
  Injectable: () => (target: unknown) => target,
  Optional: () => () => undefined,
}));

jest.mock('@angular/router', () => ({
  DefaultUrlSerializer: class {},
}));

jest.mock('@nativescript/core', () => ({
  Frame: class {},
}));

jest.mock('../../trace', () => ({
  NativeScriptDebug: {
    isLogEnabled: () => false,
    routerLog: jest.fn(),
  },
}));

jest.mock('../../tokens', () => ({
  START_PATH: Symbol('START_PATH'),
}));

jest.mock('../frame.service', () => ({
  FrameService: class {
    getFrame() {
      return null;
    }
  },
}));

import { NSLocationStrategy } from './ns-location-strategy';

describe('NSLocationStrategy', () => {
  it('clears preserved outlet state during HMR reset', () => {
    const strategy = new NSLocationStrategy({ getFrame: () => null } as any, '/signup-landing');

    (strategy as any).outlets = [{ states: [{}, {}] }, { states: [{}] }];
    (strategy as any).currentOutlet = { id: 'primary' };
    (strategy as any).currentUrlTree = { root: {} };
    (strategy as any).popStateCallbacks = [jest.fn(), jest.fn()];
    (strategy as any)._modalNavigationDepth = 2;

    expect(strategy.resetForHmr()).toEqual({
      outlets: 2,
      states: 3,
      callbacks: 2,
      hadUrlTree: true,
    });
    expect((strategy as any).outlets).toEqual([]);
    expect((strategy as any).currentOutlet).toBeNull();
    expect((strategy as any).currentUrlTree).toBeNull();
    expect((strategy as any).popStateCallbacks).toEqual([]);
    expect((strategy as any)._modalNavigationDepth).toBe(0);
  });

  it('makes ngOnDestroy idempotently drain location state', () => {
    const strategy = new NSLocationStrategy({ getFrame: () => null } as any, '/signup-landing');

    (strategy as any).outlets = [{ states: [{}] }];
    (strategy as any).currentOutlet = { id: 'primary' };
    (strategy as any).currentUrlTree = { root: {} };
    (strategy as any).popStateCallbacks = [jest.fn()];
    (strategy as any)._modalNavigationDepth = 1;

    strategy.ngOnDestroy();
    strategy.ngOnDestroy();

    expect((strategy as any).outlets).toEqual([]);
    expect((strategy as any).currentOutlet).toBeNull();
    expect((strategy as any).currentUrlTree).toBeNull();
    expect((strategy as any).popStateCallbacks).toEqual([]);
    expect((strategy as any)._modalNavigationDepth).toBe(0);
  });
});