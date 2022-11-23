// eslint-disable-next-line @typescript-eslint/triple-slash-reference
/// <reference path="../../../node_modules/webpack/module.d.ts" />
import { runTestApp } from '@nativescript/unit-test-runner';
// import other polyfills here

// polyfills required for latest karma
global.addEventListener ??= () => {
  // do nothing as there`s no global event listener
};
global.queueMicrotask ??= (fn: () => unknown) => Promise.resolve().then(fn);

runTestApp({
  runTests: () => {
    // demo app level if needed
    const tests = require.context('./', true, /\.spec\.ts$/);
    // ensure we load main.spec.ts first to initialize angular testbed
    tests('./main.spec.ts');
    tests.keys().map(tests);
  },
});
