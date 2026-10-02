/* eslint-disable */
import './core';
import { Observable, View, Utils } from '@nativescript/core';

Zone.__load_patch('nativescript_observable_events', (g, z, api: any) => {
  api.patchNativeScriptEventTarget(g, api, [Observable, Observable.prototype, View, View.prototype]);
});

Zone.__load_patch('nativescript_xhr_events', (g, z, api: any) => {
  api.patchNativeScriptEventTarget(g, api, [XMLHttpRequest.prototype]);
});

// We're patching the Utils object instead of the actual js module
Zone.__load_patch('nativescript_mainThreadify', (global, zone, api) => {
  api.patchMethod(
    Utils,
    'mainThreadify',
    (delegate, delegateName, name) =>
      function (self, args) {
        const callback = args[0];
        return delegate.apply(self, [Zone.current.wrap(callback, 'NS mainThreadify patch')]);
      }
  );
});

Zone.__load_patch('nativescript_executeOnMainThread', (global, zone, api) => {
  api.patchMethod(
    Utils,
    'executeOnMainThread',
    (delegate, delegateName, name) =>
      function (self, args) {
        const callback = args[0];
        return delegate.apply(self, [Zone.current.wrap(callback, 'NS executeOnMainThread patch')]);
      }
  );
});

Zone.__load_patch('nativescript_dispatchToMainThread', (global, zone, api) => {
  api.patchMethod(
    Utils,
    'dispatchToMainThread',
    (delegate, delegateName, name) =>
      function (self, args) {
        const callback = args[0];
        return delegate.apply(self, [Zone.current.wrap(callback, 'NS dispatchToMainThread patch')]);
      }
  );
});

Zone.__load_patch('nativescript_showModal', (global, zone, api) => {
  api.patchMethod(
    View.prototype,
    'showModal',
    (delegate, delegateName, name) =>
      function (self, args) {
        if (args.length === 2) {
          const options = args[1];
          if (options.closeCallback) {
            options.closeCallback = Zone.current.wrap(options.closeCallback, 'NS showModal patch');
          }
        } else if (args.length > 3) {
          args[3] = Zone.current.wrap(args[3], 'NS showModal patch');
        }
        return delegate.apply(self, args);
      }
  );
});

//! queueMacroTask should never be patched! We should consider it as a low level API to queue macroTasks which will be patched separately by other patches.
