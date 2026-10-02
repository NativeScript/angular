jest.mock('@angular/core', () => ({
  Injectable: () => (target: unknown) => target,
}));

jest.mock('@angular/router', () => ({}));

jest.mock('../../trace', () => ({
  NativeScriptDebug: {
    isLogEnabled: () => false,
    routeReuseStrategyLog: jest.fn(),
  },
}));

jest.mock('./ns-location-strategy', () => ({
  NSLocationStrategy: class {},
}));

jest.mock('./page-router-outlet-utils', () => ({
  destroyComponentRef: jest.fn(),
  findTopActivatedRouteNodeForOutlet: (route: unknown) => route,
  pageRouterActivatedSymbol: Symbol('page-router-activated'),
}));

import { NSRouteReuseStrategy } from './ns-route-reuse-strategy';

describe('NSRouteReuseStrategy', () => {
  it('destroys and forgets every cached outlet', () => {
    const primaryClear = jest.fn();
    const secondaryClear = jest.fn();
    const strategy = new NSRouteReuseStrategy({} as any);

    (strategy as any).cacheByOutlet = {
      primary: { clear: primaryClear },
      secondary: { clear: secondaryClear },
    };

    strategy.clearAllCaches();

    expect(primaryClear).toHaveBeenCalledTimes(1);
    expect(secondaryClear).toHaveBeenCalledTimes(1);
    expect((strategy as any).cacheByOutlet).toEqual({});
  });
});
