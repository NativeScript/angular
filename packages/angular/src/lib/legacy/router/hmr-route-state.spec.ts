import {
  captureAngularHmrPendingStartPath,
  invokeAngularHmrRouteCapture,
  installAngularHmrRouteCaptureHook,
  normalizeAngularHmrRouteUrl,
  readAngularHmrPendingStartPath,
  writeAngularHmrRouteState,
} from './hmr-route-state-core';

describe('Angular HMR route state', () => {
  const g = globalThis as any;

  afterEach(() => {
    delete g.__NS_ANGULAR_HMR_CURRENT_ROUTE__;
    delete g.__NS_ANGULAR_HMR_PENDING_START_PATH__;
    delete g.__NS_CAPTURE_ANGULAR_HMR_ROUTE__;
  });

  it('normalizes route-like values to app paths', () => {
    expect(normalizeAngularHmrRouteUrl('/talk/library')).toBe('/talk/library');
    expect(normalizeAngularHmrRouteUrl('talk/library')).toBe('/talk/library');
    expect(normalizeAngularHmrRouteUrl('?tab=list')).toBe('/?tab=list');
    expect(normalizeAngularHmrRouteUrl('')).toBeNull();
  });

  it('returns the pending HMR start path from a captured snapshot', () => {
    captureAngularHmrPendingStartPath('chatbot/42?mode=create');

    expect(readAngularHmrPendingStartPath()).toBe('/chatbot/42?mode=create');
    expect(g.__NS_ANGULAR_HMR_PENDING_START_PATH__).toMatchObject({
      url: '/chatbot/42?mode=create',
      source: 'hmr-reboot',
    });
  });

  it('uses the installed capture hook before falling back to the last route snapshot', () => {
    const dispose = installAngularHmrRouteCaptureHook(() => captureAngularHmrPendingStartPath('/talk/library?tab=saved'));

    try {
      expect(invokeAngularHmrRouteCapture()).toBe('/talk/library?tab=saved');
      expect(readAngularHmrPendingStartPath()).toBe('/talk/library?tab=saved');
    } finally {
      dispose();
    }

    expect(g.__NS_CAPTURE_ANGULAR_HMR_ROUTE__).toBeUndefined();
  });

  it('falls back to the last known route when no capture hook is installed', () => {
    writeAngularHmrRouteState('/profile?tab=goals', { source: 'navigation-end' });

    expect(invokeAngularHmrRouteCapture()).toBe('/profile?tab=goals');
    expect(readAngularHmrPendingStartPath()).toBe('/profile?tab=goals');
  });
});