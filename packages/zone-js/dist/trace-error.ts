/* eslint-disable */
import { Trace } from '@nativescript/core';

Zone.__load_patch('nativescript_zone_to_trace_error', (global, zone, api) => {
  zone[zone.__symbol__('unhandledPromiseRejectionHandler')] = (e) => {
    Trace.error(e);
  };
  zone[zone.__symbol__('ignoreConsoleErrorUncaughtError')] = true;
});
