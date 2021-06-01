/* eslint-disable */
import './core';
import { Connectivity } from '@nativescript/core';

Zone.__load_patch('nativescript_connectivity', (global, zone, api) => {
  api.patchMethod(
    Connectivity,
    'startMonitoring',
    (delegate, delegateName, name) =>
      function (self, args) {
        const callback = args[0];
        return delegate.apply(self, [Zone.current.wrap(callback, 'NS Connectivity patch')]);
      }
  );
});
