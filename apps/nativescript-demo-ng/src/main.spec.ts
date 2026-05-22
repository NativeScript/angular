import './polyfills';
import '@nativescript/zone-js/dist/pre-zone-polyfills';

// Zone JS is required by default for Angular itself
import 'zone.js';

// Add NativeScript specific Zone JS patches
import '@nativescript/zone-js';
import 'zone.js/testing';
import { TestBed } from '@angular/core/testing';
import { platformBrowserDynamicTesting } from '@angular/platform-browser-dynamic/testing';
import { NativeScriptTestingModule } from '@nativescript/angular/testing';

TestBed.initTestEnvironment(NativeScriptTestingModule, platformBrowserDynamicTesting(), {
  teardown: { destroyAfterEach: true },
});
