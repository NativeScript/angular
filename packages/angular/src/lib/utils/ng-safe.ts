/**
 * This decorator delays a potentially unsafe event (like loaded/unloaded that will sometimes be called before ngOnInit) to be handled safely by ensuring it's called after a lifecycle hook.
 * @param runAfterEvent event/function call to wait until the event can be fired ('ngOnInit', 'ngAfterViewInit', ...)
 * @param options Optional event handling params
 * @returns decorator
 */
export function NativeScriptNgSafeEvent(
  runAfterEvent: string,
  options: {
    onlyLast?: boolean;
    onlyFirst?: boolean;
    alwaysRunBefore?: string;
  } = {}
) {
  const event = runAfterEvent;
  return function (target: unknown, propertyKey: string, descriptor: PropertyDescriptor) {
    type NgSafeType = {
      events: {
        [key: string]: {
          done: boolean;
          originalDelegate: (...args: unknown[]) => unknown;
          buffer: Array<{
            key: string;
            fn: (...args: unknown[]) => unknown;
          }>;
        };
      };
      runBefore: {
        [propertyKey: string]: (...args: unknown[]) => unknown;
      };
    };
    function getNgSafe(): NgSafeType {
      return target['__ng_safe__'];
    }
    if (!target['__ng_safe__']) {
      const defaultNgSafe: NgSafeType = {
        events: {},
        runBefore: {},
      };
      target['__ng_safe__'] = defaultNgSafe;
    }
    if (!getNgSafe().events[event]) {
      getNgSafe().events[event] = {
        done: false,
        buffer: [],
        originalDelegate: target[event],
      };
      target[event] = function (...args) {
        try {
          if (getNgSafe().events[event].originalDelegate) {
            return getNgSafe().events[event].originalDelegate.apply(this, args);
          }
        } finally {
          getNgSafe().events[event].done = true;
          getNgSafe().events[event].buffer.forEach((fn) => fn.fn());
          getNgSafe().events[event].buffer = [];
        }
      };
    }

    if (options.alwaysRunBefore) {
      getNgSafe().runBefore[propertyKey] = target[options.alwaysRunBefore];

      target[`${options.alwaysRunBefore}`] = function (...args) {
        getNgSafe()
          .events[event].buffer.filter((v) => v.key === propertyKey)
          .forEach((fn) => fn.fn());
        getNgSafe().events[event].buffer = getNgSafe().events[event].buffer.filter((v) => v.key !== propertyKey);
        getNgSafe().runBefore[propertyKey];
        if (getNgSafe().runBefore[propertyKey]) {
          return getNgSafe().runBefore[propertyKey].apply(this, args);
        }
      };
    }

    const oldFn = descriptor.value;
    descriptor.value = function (...args) {
      if (getNgSafe().events[event].done) {
        return oldFn.apply(this, args);
      }
      let shouldPush = true;
      if (options.onlyFirst || options.onlyLast) {
        for (let i = 0; i < getNgSafe().events[event].buffer.length; i++) {
          if (getNgSafe().events[event].buffer[i].key === propertyKey) {
            if (options.onlyFirst) {
              shouldPush = false;
              break;
            }
            if (options.onlyLast) {
              getNgSafe().events[event].buffer.splice(i, 1);
              break;
            }
          }
        }
      }
      if (shouldPush) {
        getNgSafe().events[event].buffer.push({
          key: propertyKey,
          fn: oldFn.bind(this, args),
        });
      }
    };
  };
}
