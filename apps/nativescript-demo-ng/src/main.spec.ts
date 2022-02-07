import './polyfills';
import 'zone.js/dist/zone-testing.js';
import { TestBed } from '@angular/core/testing';
import { platformBrowserDynamicTesting } from '@angular/platform-browser-dynamic/testing';
import { NativeScriptTestingModule } from '@nativescript/angular/testing';

TestBed.initTestEnvironment(NativeScriptTestingModule, platformBrowserDynamicTesting(), { teardown: { destroyAfterEach: true } });
