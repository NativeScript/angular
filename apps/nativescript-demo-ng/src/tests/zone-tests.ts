import { Observable, View } from '@nativescript/core';

describe('Zone patches', () => {
  function createZone(name: string) {
    return Zone.root.fork({
      name,
    });
  }
  const zone1 = createZone('zone1');
  it('should patch Observable.prototype', () => {
    expect(Observable.prototype[Zone.__symbol__('addEventListener')]).toBeDefined();
    expect(Observable.prototype[Zone.__symbol__('removeEventListener')]).toBeDefined();
    expect(Observable.prototype[Zone.__symbol__('once')]).toBeDefined();
  });

  it('should patch Observable static events', () => {
    expect(Observable[Zone.__symbol__('addEventListener')]).toBeDefined();
    expect(Observable[Zone.__symbol__('removeEventListener')]).toBeDefined();
    expect(Observable[Zone.__symbol__('once')]).toBeDefined();
  });

  it('should patch View events', () => {
    expect(View.prototype[Zone.__symbol__('addEventListener')]).toBeDefined();
    expect(View.prototype[Zone.__symbol__('addEventListener')]).not.toBe(Observable.prototype[Zone.__symbol__('addEventListener')]);
    expect(View.prototype[Zone.__symbol__('removeEventListener')]).toBeDefined();
    expect(View.prototype[Zone.__symbol__('removeEventListener')]).not.toBe(Observable.prototype[Zone.__symbol__('removeEventListener')]);
    expect(View.prototype[Zone.__symbol__('once')]).toBeDefined();
    expect(View.prototype[Zone.__symbol__('once')]).withContext('View does not override once, so it should inherit from Observable').toBe(Observable.prototype[Zone.__symbol__('once')]);
  });

  it('should call event on target zone', () => {
    let whichZone: string;
    const obs = new Observable();
    zone1.run(() => {
      obs.addEventListener('testEvent', () => (whichZone = Zone.current.name));
    });
    Zone.root.run(() => {
      obs.notify({ eventName: 'testEvent' });
    });
    expect(whichZone).toBe('zone1');
  });

  it('should call event on target zone even with deep nesting', () => {
    let whichZone: string;
    const obs = new Observable();
    zone1.run(() => {
      createZone('zone2').run(() => {
        createZone('zone3').run(() => {
          obs.addEventListener('testEvent', () => (whichZone = Zone.current.name));
        });
      });
    });
    Zone.root.run(() => {
      obs.notify({ eventName: 'testEvent' });
    });
    expect(whichZone).toBe('zone3');
  });

  it('should remove event', () => {
    let whichZone: string;
    const obs = new Observable();
    const callback = () => (whichZone = Zone.current.name);
    zone1.run(() => {
      obs.addEventListener('testEvent', callback);
    });
    obs.removeEventListener('testEvent', callback);
    Zone.root.run(() => {
      obs.notify({ eventName: 'testEvent' });
    });
    expect(whichZone).toBeUndefined();
  });

  it('should not throw when removing inexisting listener', () => {
    let whichZone: string;
    const obs = new Observable();
    const callback = () => (whichZone = Zone.current.name);
    obs.removeEventListener('testEvent', callback);
    Zone.root.run(() => {
      obs.notify({ eventName: 'testEvent' });
    });
    expect(whichZone).toBeUndefined();
  });

  it('should allow duplicate events', () => {
    let whichZone: string;
    const obs = new Observable();
    const callback = () => (whichZone = Zone.current.name);
    zone1.run(() => {
      obs.addEventListener('testEvent', callback);
      obs.addEventListener('testEvent', callback);
    });
    obs.removeEventListener('testEvent', callback);
    Zone.root.run(() => {
      obs.notify({ eventName: 'testEvent' });
    });
    expect(whichZone).toBe('zone1');
  });

  it('should remove all events when no callback is specified', () => {
    let whichZone: string;
    const obs = new Observable();
    const callback = () => (whichZone = Zone.current.name);
    zone1.run(() => {
      obs.addEventListener('testEvent', callback);
      obs.addEventListener('testEvent', callback);
    });
    obs.removeEventListener('testEvent');
    Zone.root.run(() => {
      obs.notify({ eventName: 'testEvent' });
    });
    expect(whichZone).toBeUndefined();
  });

  it('should not throw when removing eventListeners after a removeEventListener without callback', () => {
    let whichZone: string;
    const obs = new Observable();
    const callback = () => (whichZone = Zone.current.name);
    zone1.run(() => {
      obs.addEventListener('testEvent', callback);
      obs.addEventListener('testEvent', callback);
    });
    obs.removeEventListener('testEvent');
    expect(() => obs.removeEventListener('testEvent', callback)).not.toThrow();
    expect(() => obs.removeEventListener('testEvent')).not.toThrow();
  });
});
