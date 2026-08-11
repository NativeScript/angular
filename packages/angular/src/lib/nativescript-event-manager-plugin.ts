import { Injectable } from '@angular/core';
import { EventManagerPlugin } from '@angular/platform-browser';
import { Observable, View } from '@nativescript/core';
import { NativeScriptDebug } from './trace';

/**
 * Default event plugin for NativeScript views. Registered last on
 * `EVENT_MANAGER_PLUGINS`, it supports every event name and binds handlers
 * through the NativeScript `Observable` event system (`View.on`/`View.off`).
 *
 * Custom plugins registered by applications take priority over this one, so
 * event-name sugar such as `(tap.debounce.500)` can be intercepted exactly as
 * described in https://angular.dev/guide/templates/event-listeners#extend-event-handling.
 *
 * Plugin authors: do not wrap `addEventListener` in `runOutsideAngular` —
 * zone capture happens inside the zone-patched `View.on()` in the caller's
 * zone, and change detection relies on it.
 */
@Injectable()
export class NativeScriptEventManagerPlugin extends EventManagerPlugin {
  constructor() {
    // The base class only stores the document reference and this plugin never
    // touches it — passing null avoids a hard DOCUMENT dependency.
    super(null);
  }

  supports(eventName: string): boolean {
    return true;
  }

  addEventListener(element: unknown, eventName: string, handler: (data?: unknown) => void): VoidFunction {
    const target = element as View;
    if (NativeScriptDebug.enabled) {
      NativeScriptDebug.rendererLog(`NativeScriptEventManagerPlugin.addEventListener: ${eventName}`);
    }
    target.on(eventName, handler);
    if (eventName === View.loadedEvent && target.isLoaded) {
      // we must create a new obervable here to ensure that the event goes through whatever zone patches are applied
      const obs = new Observable();
      obs.once(eventName, handler);
      obs.notify({
        eventName,
        object: target,
      });
    }
    return () => target.off(eventName, handler);
  }
}
