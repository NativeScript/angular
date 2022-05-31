/* eslint-disable  */
const ZONE_SYMBOL_PREFIX = Zone.__symbol__('');
const zoneSymbolEventNames: any = {};
const ADD_EVENT_LISTENER_STR = 'addEventListener';
const REMOVE_EVENT_LISTENER_STR = 'removeEventListener';
function prepareEventNames(eventName: string, eventNameToString?: (eventName: string) => string) {
  // const falseEventName = (eventNameToString ? eventNameToString(eventName) : eventName) + FALSE_STR;
  // const trueEventName = (eventNameToString ? eventNameToString(eventName) : eventName) + TRUE_STR;
  // const symbol = ZONE_SYMBOL_PREFIX + falseEventName;
  // const symbolCapture = ZONE_SYMBOL_PREFIX + trueEventName;
  // zoneSymbolEventNames[eventName] = {};
  // zoneSymbolEventNames[eventName][FALSE_STR] = symbol;
  // zoneSymbolEventNames[eventName][TRUE_STR] = symbolCapture;
  const symbol = ZONE_SYMBOL_PREFIX + (eventNameToString ? eventNameToString(eventName) : eventName) + 'false';
  zoneSymbolEventNames[eventName] = symbol;
}
interface NSTaskData {
  thisArg?: any;
  eventName?: string;
  target?: any;
  actualDelegate?: any;
}
interface ExtendedTaskData extends TaskData {
  nsTaskData?: NSTaskData;
}

interface ExtendedTask extends Task {
  thisArg?: WeakRef<any>;
  eventName?: string;
  target?: any;
  customCallback?: any;
  ranOnce?: boolean;
}
export interface PatchEventTargetOptions {
  // validateHandler
  vh?: (nativeDelegate: any, delegate: any, target: any, args: any) => boolean;
  // addEventListener function name
  add?: string;
  // removeEventListener function name
  rm?: string;
  // once function name
  once?: string;
  // listeners function name
  listeners?: string;
  // removeAllListeners function name
  rmAll?: string;
  // check duplicate flag when addEventListener
  chkDup?: boolean;
  // return target flag when addEventListener
  rt?: boolean;
  // event compare handler
  diff?: (task: any, delegate: any) => boolean;
  // support passive or not
  supportPassive?: boolean;
  // get string from eventName (in nodejs, eventName maybe Symbol)
  eventNameToString?: (eventName: any) => string;
  // transfer eventName
  transferEventName?: (eventName: string) => string;
}

export function patchNativeScriptEventTarget(global: any, api: _ZonePrivate, apis?: any[], patchOptions?: PatchEventTargetOptions) {
  const ADD_EVENT_LISTENER = (patchOptions && patchOptions.add) || ADD_EVENT_LISTENER_STR;
  const REMOVE_EVENT_LISTENER = (patchOptions && patchOptions.rm) || REMOVE_EVENT_LISTENER_STR;
  const ONCE = (patchOptions && patchOptions.once) || 'once';

  const zoneSymbolAddEventListener = Zone.__symbol__(ADD_EVENT_LISTENER);

  const ADD_EVENT_LISTENER_SOURCE = '.' + ADD_EVENT_LISTENER + ':';

  function patchNativeScriptEventTargetMethods(obj, patchOptions) {
    if (!obj) {
      return false;
    }
    const eventNameToString = patchOptions && patchOptions.eventNameToString;
    // let proto = obj;
    // while (proto && !proto.hasOwnProperty(ADD_EVENT_LISTENER)) {
    //   proto = Object.getPrototypeOf(proto);
    // }
    // if (!proto && obj[ADD_EVENT_LISTENER]) {
    //   // somehow we did not find it, but we can see it. This happens on IE for Window properties.
    //   proto = obj;
    // }

    // if (!proto) {
    //   return false;
    // }
    // if (proto[zoneSymbolAddEventListener]) {
    //   return false;
    // }
    function compare(task: ExtendedTask, delegate: any, thisArg?: any) {
      const taskThis = task.thisArg ? task.thisArg.get() : undefined;
      if (!thisArg) {
        thisArg = undefined; // keep consistent
      }
      return task.callback === delegate && taskThis === thisArg;
    }

    const nativeAddListener = api.patchMethod(
      obj,
      ADD_EVENT_LISTENER,
      (delegate, delegateName, name) =>
        function (originalTarget, originalArgs) {
          const addSingleEvent = function (target, args) {
            const eventName = args[0];
            const callback = args[1];
            const taskData: NSTaskData = {};
            const thisArg = (args.length > 1 && args[2]) || undefined;
            taskData.target = target;
            taskData.eventName = eventName;
            taskData.thisArg = thisArg;
            let symbolEventNames = zoneSymbolEventNames[eventName];
            if (!symbolEventNames) {
              prepareEventNames(eventName, eventNameToString);
              symbolEventNames = zoneSymbolEventNames[eventName];
            }
            const symbolEventName = symbolEventNames;
            let existingTasks = target[symbolEventName];
            let isExisting = false;
            let checkDuplicate = false;
            if (existingTasks) {
              // already have task registered
              isExisting = true;
              if (checkDuplicate) {
                for (let i = 0; i < existingTasks.length; i++) {
                  if (compare(existingTasks[i], delegate, taskData.thisArg)) {
                    // same callback, same capture, same event name, just return
                    return;
                  }
                }
              }
            } else {
              existingTasks = target[symbolEventName] = [];
            }
            const schedule = (task: Task) => {
              const args2 = [taskData.eventName, task.invoke];
              if (taskData.thisArg) {
                args2.push(taskData.thisArg);
              }
              delegate.apply(target, args2);
            };
            const unschedule = (task: ExtendedTask) => {
              const args2 = [task.eventName, task.invoke];
              if (task.thisArg) {
                args2.push(task.thisArg.get());
              }
              nativeRemoveListener.apply(target, args2);
            };
            const data: ExtendedTaskData = {
              nsTaskData: taskData,
            };
            const objName = obj.name || obj?.constructor?.name;
            const task: ExtendedTask = Zone.current.scheduleEventTask(objName + ':' + (eventNameToString ? eventNameToString(eventName) : eventName), callback, data, schedule, unschedule);
            // should clear taskData.target to avoid memory leak
            // issue, https://github.com/angular/angular/issues/20442
            taskData.target = null;

            // need to clear up taskData because it is a global object
            if (data) {
              data.nsTaskData = null;
            }
            task.target = target;
            // task.capture = capture;
            task.thisArg = (thisArg && new WeakRef(thisArg)) || undefined;
            task.eventName = eventName;
            existingTasks.push(task);
            // return nativeAddListener.apply(target, args);
          };
          const events: string[] = typeof originalArgs[0] === 'string' ? originalArgs[0].split(',') : [];
          if (events.length > 0) {
            Array.prototype.splice.call(originalArgs, 0, 1);
            for (let i = 0; i < events.length; i++) {
              addSingleEvent(originalTarget, [events[i].trim(), ...originalArgs]);
            }
          } else {
            addSingleEvent(originalTarget, originalArgs);
          }
        }
    );

    const nativeOnce = api.patchMethod(
      obj,
      ONCE,
      (delegate, delegateName, name) =>
        function (originalTarget, originalArgs) {
          const addSingleEvent = function (target, args) {
            const eventName = args[0];
            const callback = args[1];
            const taskData: NSTaskData = {};
            const thisArg = (args.length > 1 && args[2]) || undefined;
            taskData.target = target;
            taskData.eventName = eventName;
            taskData.thisArg = thisArg;
            let symbolEventNames = zoneSymbolEventNames[eventName];
            if (!symbolEventNames) {
              prepareEventNames(eventName, eventNameToString);
              symbolEventNames = zoneSymbolEventNames[eventName];
            }
            const symbolEventName = symbolEventNames;
            let existingTasks = target[symbolEventName];
            let isExisting = false;
            let checkDuplicate = false;
            if (existingTasks) {
              // already have task registered
              isExisting = true;
              if (checkDuplicate) {
                for (let i = 0; i < existingTasks.length; i++) {
                  if (compare(existingTasks[i], delegate, taskData.thisArg)) {
                    // same callback, same capture, same event name, just return
                    return;
                  }
                }
              }
            } else {
              existingTasks = target[symbolEventName] = [];
            }
            const schedule = (task: ExtendedTask) => {
              task.ranOnce = false;
              task.customCallback = function (...args) {
                task.invoke.apply(this, args);
                task.ranOnce = true;
                task.target[REMOVE_EVENT_LISTENER](task.eventName, task.callback, task.thisArg ? task.thisArg.get() : undefined);
              };
              const args2 = [taskData.eventName, task.invoke];
              if (taskData.thisArg) {
                args2.push(taskData.thisArg);
              }
              delegate.apply(target, args2);
            };
            const unschedule = (task: ExtendedTask) => {
              if (task.ranOnce) {
                return;
              }
              const args2 = [task.eventName, task.invoke];
              if (task.thisArg) {
                args2.push(task.thisArg.get());
              }
              nativeRemoveListener.apply(target, args2);
            };
            const data: ExtendedTaskData = {
              nsTaskData: taskData,
            };
            const objName = obj.name || obj?.constructor?.name;
            const task: ExtendedTask = Zone.current.scheduleEventTask(objName + ':' + (eventNameToString ? eventNameToString(eventName) : eventName), callback, data, schedule, unschedule);
            // should clear taskData.target to avoid memory leak
            // issue, https://github.com/angular/angular/issues/20442
            taskData.target = null;

            // need to clear up taskData because it is a global object
            if (data) {
              data.nsTaskData = null;
            }
            task.target = target;
            // task.capture = capture;
            task.thisArg = (thisArg && new WeakRef(thisArg)) || undefined;
            task.eventName = eventName;
            existingTasks.push(task);
          };
          const events: string[] = originalArgs && Array.isArray(originalArgs) && typeof originalArgs[0] === 'string' ? originalArgs[0].split(',') : [];
          if (events.length > 0) {
            if (originalArgs && Array.isArray(originalArgs)) {
              originalArgs.splice(0, 1);
            }
            for (let i = 0; i < events.length; i++) {
              addSingleEvent(originalTarget, [events[i].trim(), ...originalArgs]);
            }
          } else {
            addSingleEvent(originalTarget, originalArgs);
          }
        }
    );

    const nativeRemoveListener = api.patchMethod(
      obj,
      REMOVE_EVENT_LISTENER,
      (delegate, delegateName, name) =>
        function (originalTarget, originalArgs) {
          const removeSingleEvent = function (target, args) {
            const eventName = args[0];
            const callback = args[1];
            const thisArg = (args.length > 1 && args[2]) || undefined;
            const symbolEventNames = zoneSymbolEventNames[eventName];
            const symbolEventName = symbolEventNames;
            const existingTasks: Task[] = symbolEventName && target[symbolEventName];
            const removeAll = !callback; // object.off(event);
            if (existingTasks) {
              if (removeAll) {
                target[symbolEventName] = null;
              }
              for (let i = 0; i < existingTasks.length; i++) {
                const existingTask = existingTasks[i];
                if (removeAll) {
                  (existingTask as any).isRemoved = true;
                  (existingTask as any).allRemoved = true;
                  existingTask.zone.cancelTask(existingTask);
                  continue;
                }
                if (compare(existingTask, callback, thisArg)) {
                  existingTasks.splice(i, 1);
                  // set isRemoved to data for faster invokeTask check
                  (existingTask as any).isRemoved = true;
                  if (existingTasks.length === 0) {
                    // all tasks for the eventName + capture have gone,
                    // remove globalZoneAwareCallback and remove the task cache from target
                    (existingTask as any).allRemoved = true;
                    target[symbolEventName] = null;
                  }
                  existingTask.zone.cancelTask(existingTask);
                  return;
                }
              }
            }
            return nativeRemoveListener.apply(target, args);
          };
          const events: string[] = typeof originalArgs[0] === 'string' ? originalArgs[0].split(',') : [];
          if (events.length > 0) {
            Array.prototype.splice.call(originalArgs, 0, 1);
            for (let i = 0; i < events.length; i++) {
              removeSingleEvent(originalTarget, [events[i].trim(), ...originalArgs]);
            }
          } else {
            removeSingleEvent(originalTarget, originalArgs);
          }
        }
    );
  }

  let results: any[] = [];
  for (let i = 0; i < apis.length; i++) {
    results[i] = patchNativeScriptEventTargetMethods(apis[i], patchOptions);
  }

  return results;
}

const _global = global;

const zoneSymbol = Zone.__symbol__;

const originalInstanceKey = zoneSymbol('originalInstance');

function getAllPropertyNames(obj: unknown) {
  const props = new Set<string>();

  do {
    Object.getOwnPropertyNames(obj).forEach((prop) => {
      props.add(prop);
    });
  } while ((obj = Object.getPrototypeOf(obj)) && obj !== Object.prototype);

  return Array.from(props);
}

// wrap some native API on `window`
export function patchClass(className: string, api: _ZonePrivate) {
  const OriginalClass = _global[className];
  if (!OriginalClass) return;
  // keep original class in global
  _global[zoneSymbol(className)] = OriginalClass;

  _global[className] = function () {
    const a = api.bindArguments(<any>arguments, className);
    switch (a.length) {
      case 0:
        this[originalInstanceKey] = new OriginalClass();
        break;
      case 1:
        this[originalInstanceKey] = new OriginalClass(a[0]);
        break;
      case 2:
        this[originalInstanceKey] = new OriginalClass(a[0], a[1]);
        break;
      case 3:
        this[originalInstanceKey] = new OriginalClass(a[0], a[1], a[2]);
        break;
      case 4:
        this[originalInstanceKey] = new OriginalClass(a[0], a[1], a[2], a[3]);
        break;
      default:
        throw new Error('Arg list too long.');
    }
  };

  // attach original delegate to patched function
  api.attachOriginToPatched(_global[className], OriginalClass);

  const instance = new OriginalClass(function () {});

  let prop;
  for (prop of getAllProperties(instance)) {
    // https://bugs.webkit.org/show_bug.cgi?id=44721
    if (className === 'XMLHttpRequest' && prop === 'responseBlob') continue;
    (function (prop) {
      if (typeof instance[prop] === 'function') {
        _global[className].prototype[prop] = function () {
          return this[originalInstanceKey][prop].apply(this[originalInstanceKey], arguments);
        };
      } else {
        api.ObjectDefineProperty(_global[className].prototype, prop, {
          set: function (fn) {
            if (typeof fn === 'function') {
              this[originalInstanceKey][prop] = api.wrapWithCurrentZone(fn, className + '.' + prop);
              // keep callback in wrapped function so we can
              // use it in Function.prototype.toString to return
              // the native one.
              api.attachOriginToPatched(this[originalInstanceKey][prop], fn);
            } else {
              this[originalInstanceKey][prop] = fn;
            }
          },
          get: function () {
            return this[originalInstanceKey][prop];
          },
        });
      }
    })(prop);
  }

  for (prop of Object.getOwnPropertyNames(OriginalClass)) {
    if (prop !== 'prototype' && OriginalClass.hasOwnProperty(prop) && isWritable(_global[className], prop)) {
      _global[className][prop] = OriginalClass[prop];
    }
  }
}

function getAllProperties(toCheck: any, lastProto = Object.prototype) {
  const props = [];
  let obj = toCheck;
  do {
    props.push(...Object.getOwnPropertyNames(obj));
  } while ((obj = Object.getPrototypeOf(obj)) && obj !== lastProto);

  return Array.from(new Set(props));
}

function isWritable<T extends Object>(obj: T, key: keyof T) {
  return Object.getOwnPropertyDescriptor(obj, key)?.writable ?? true;
}
