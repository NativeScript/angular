const ZONE_SYMBOL_PREFIX = Zone.__symbol__('');
const zoneSymbolEventNames: any = {};
function prepareEventNames(eventName: string, eventNameToString?: (eventName: string) => string) {
  // const falseEventName = (eventNameToString ? eventNameToString(eventName) : eventName) + FALSE_STR;
  // const trueEventName = (eventNameToString ? eventNameToString(eventName) : eventName) + TRUE_STR;
  // const symbol = ZONE_SYMBOL_PREFIX + falseEventName;
  // const symbolCapture = ZONE_SYMBOL_PREFIX + trueEventName;
  // zoneSymbolEventNames[eventName] = {};
  // zoneSymbolEventNames[eventName][FALSE_STR] = symbol;
  // zoneSymbolEventNames[eventName][TRUE_STR] = symbolCapture;
  const symbol = ZONE_SYMBOL_PREFIX + (eventNameToString ? eventNameToString(eventName) : eventName);
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

export function patchEventListeners(cls: any) {
  function compare(task: ExtendedTask, delegate: any, thisArg?: any) {
    const taskThis = task.thisArg ? task.thisArg.get() : undefined;
    if (!thisArg) {
      thisArg = undefined; // keep consistent
    }
    return task.callback === delegate && taskThis === thisArg;
  }
  Zone.__load_patch(cls.name + ':eventListeners', (global: any, Zone, api) => {
    const ADD_EVENT_LISTENER = 'addEventListener';
    const REMOVE_EVENT_LISTENER = 'removeEventListener';
    const ONCE = 'once';
    const nativeAddListener = api.patchMethod(
      cls.prototype,
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
              prepareEventNames(eventName);
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
            const task: ExtendedTask = Zone.current.scheduleEventTask(cls.name + ':' + taskData.eventName, callback, data, schedule, unschedule);
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
      cls.prototype,
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
              prepareEventNames(eventName);
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
            const task: ExtendedTask = Zone.current.scheduleEventTask(cls.name + ':' + taskData.eventName, callback, data, schedule, unschedule);
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
      cls.prototype,
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
            if (existingTasks) {
              for (let i = 0; i < existingTasks.length; i++) {
                const existingTask = existingTasks[i];
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
  });
}
