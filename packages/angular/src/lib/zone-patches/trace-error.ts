import { Trace } from "@nativescript/core";

Zone.__load_patch('Zone error to trace error', (global, zone, api) => {
    zone[zone.__symbol__('unhandledPromiseRejectionHandler')] = (e) => {
        Trace.error(e);
    }
    zone[zone.__symbol__('ignoreConsoleErrorUncaughtError')] = true;
});