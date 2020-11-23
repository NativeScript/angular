/// <reference path="../../../../node_modules/zone.js/zone.d.ts" />

import { Label, Observable, View } from '@nativescript/core';

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
}
interface ExtendedTaskData extends TaskData {
	nsTaskData?: NSTaskData;
}

function isPropertyWritable(propertyDesc: any) {
	if (!propertyDesc) {
		return true;
	}

	if (propertyDesc.writable === false) {
		return false;
	}

	return !(typeof propertyDesc.get === 'function' && typeof propertyDesc.set === 'undefined');
}

Zone.__load_patch('nativescript patchMethod', (global, Zone, api) => {
	api.patchMethod = function patchMethod(target: any, name: string, patchFn: (delegate: Function, delegateName: string, name: string) => (self: any, args: any[]) => any): Function | null {
		let proto = target;
		while (proto && !proto.hasOwnProperty(name)) {
			proto = Object.getPrototypeOf(proto);
		}
		if (!proto && target[name]) {
			// somehow we did not find it, but we can see it. This happens on IE for Window properties.
			proto = target;
		}

		const delegateName = Zone.__symbol__(name);
		let delegate: Function | null = null;
		if (proto && !proto.hasOwnProperty(delegateName)) {
			delegate = proto[delegateName] = proto[name];
			// check whether proto[name] is writable
			// some property is readonly in safari, such as HtmlCanvasElement.prototype.toBlob
			const desc = proto && api.ObjectGetOwnPropertyDescriptor(proto, name);
			if (isPropertyWritable(desc)) {
				const patchDelegate = patchFn(delegate!, delegateName, name);
				proto[name] = function () {
					return patchDelegate(this, arguments as any);
				};
				api.attachOriginToPatched(proto[name], delegate);
				//   if (shouldCopySymbolProperties) {
				// 	copySymbolProperties(delegate, proto[name]);
				//   }
			}
		}
		return delegate;
	};
});

function patchEventListeners(cls: any) {
	function compare(task: Task, delegate: any, thisArg?: any) {
		return task.callback === delegate && (task.data as ExtendedTaskData).nsTaskData.thisArg === thisArg;
	}
	Zone.__load_patch(cls.name + ':eventListeners', (global: any, Zone, api) => {
		const nativeAddListener = api.patchMethod(
			cls.prototype,
			'addEventListener',
			(delegate, delegateName, name) =>
				function (target, args) {
					const eventName = args[0];
					const callback = args[1];
					const taskData: NSTaskData = {};
					taskData.target = target;
					taskData.eventName = eventName;
					taskData.thisArg = (args.length > 1 && args[2]) || undefined;
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
					const unschedule = (task: Task) => {
						const args2 = [taskData.eventName, task.invoke];
						if (taskData.thisArg) {
							args2.push(taskData.thisArg);
						}
						nativeRemoveListener.apply(target, args2);
					};
					const data: ExtendedTaskData = {
						nsTaskData: taskData,
					};
					const task = Zone.current.scheduleEventTask(cls.name + ':' + taskData.eventName, callback, data, schedule, unschedule);
					// return nativeAddListener.apply(target, args);
				}
		);

		const nativeRemoveListener = api.patchMethod(
			cls.prototype,
			'removeEventListener',
			(delegate, delegateName, name) =>
				function (target, args) {
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
				}
		);
	});
}

patchEventListeners(Observable);
patchEventListeners(View);
