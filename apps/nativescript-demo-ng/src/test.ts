import { runTestApp } from '@nativescript/unit-test-runner';
// import other polyfills here

declare let require: any;

runTestApp({
  runTests: () => {
    // demo app level if needed
    const tests = require.context('./', true, /\.spec\.ts$/);
    // ensure we load main.spec.ts first to initialize angular testbed
    tests('./main.spec.ts');
    tests.keys().map(tests);
  },
});
