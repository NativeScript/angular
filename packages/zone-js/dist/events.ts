/* eslint-disable */
import './core';
import { Observable, View } from '@nativescript/core';

Zone.__load_patch('nativescript_observable_events', (g, z, api: any) => {
  api.patchNativeScriptEventTarget(g, api, [Observable, Observable.prototype, View, View.prototype]);
});

Zone.__load_patch('nativescript_xhr_events', (g, z, api: any) => {
  api.patchNativeScriptEventTarget(g, api, [XMLHttpRequest.prototype]);
});
