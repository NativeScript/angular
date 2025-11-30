import { NativeScriptConfig } from '@nativescript/core';

export default {
  id: 'org.nativescript.demong',
  appResourcesPath: 'App_Resources',
  android: {
    v8Flags: '--expose_gc',
    markingMode: 'none',
    codeCache: true,
    suppressCallJSMethodExceptions: false,
    discardUncaughtJsExceptions: true,
  },
  ios: {
    discardUncaughtJsExceptions: false,
  },
  appPath: 'src',
  cli: {
    packageManager: 'npm',
  },
  bundler: 'vite',
  bundlerConfigPath: 'vite.config.ts',
  logScriptLoading: true,
} as NativeScriptConfig;
