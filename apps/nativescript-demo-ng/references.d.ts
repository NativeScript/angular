/* eslint-disable @typescript-eslint/triple-slash-reference */
/// <reference path="../../node_modules/@nativescript/types-ios/index.d.ts" />
/// <reference path="../../node_modules/@nativescript/types-android/lib/android-29.d.ts" />

declare namespace NodeJS {
  interface Global {
      __runtimeVersion: any;
      TNS_ENV: string;
  }
}
