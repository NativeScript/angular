import '@nativescript/core/globals';
import '@nativescript/angular/polyfills';
import '@nativescript/zone-js/dist/pre-zone-polyfills';
import 'zone.js';
import '@nativescript/zone-js';
import 'zone.js/testing';
import { TestBed } from '@angular/core/testing';
import { NativeScriptTestingModule } from '@nativescript/angular/testing';
import { NativeScriptModule } from '@nativescript/angular';
import { platformBrowserDynamicTesting } from '@angular/platform-browser-dynamic/testing';

TestBed.initTestEnvironment([NativeScriptTestingModule], platformBrowserDynamicTesting());
