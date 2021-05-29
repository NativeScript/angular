import '@nativescript/core/globals';
import 'zone.js/dist/zone.js';
import '@nativescript/zone-js';
import '@nativescript/zone-js/dist/connectivity'; // optional: patch connectivity
import '@nativescript/zone-js/dist/trace-error'; // optional: redirect all zone errors to Trace.error
import { Label, Observable, Trace, View } from '@nativescript/core';
// Trace.setErrorHandler({
//   handlerError: (e) => {
//     console.log('------error has been handled------', e);
//   },
// });
// // kill zonedCallback
// global.zonedCallback = (c) => c;

// const t = new Label();

// t.addEventListener(
//   'test',
//   function () {
//     console.log(this);
//     console.log('test Zone:', Zone.current.name);
//   },
//   {
//     v: 1,
//   }
// );

// const zone2 = Zone.current.fork({
//   name: 'zone2',
// });
// console.log('1');

// zone2.run(() => {
//   setTimeout(() => console.log('setTimeout', Zone.current.name));
//   t.addEventListener(
//     'test',
//     function () {
//       console.log(this);
//       console.log('test Zone2:', Zone.current.name);
//       global[Zone.__symbol__('Promise')].resolve()[Zone.__symbol__('then')](() => console.log('actual microtask!'));
//       Promise.resolve().then(() => console.log('test microtask will fire before 2! (right after event task finishes)'));
//       Promise.resolve().then(() => {
//         throw new Error('HANDLE THIS!');
//       });
//     },
//     {
//       v: 2,
//     }
//   );
// });
// t.notify({
//   eventName: 'test',
//   object: null,
// });
// console.log('2');

// (new Label()).on("test", () => console.log("test Zone:", Zone.current.name););
