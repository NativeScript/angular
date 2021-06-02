import '@nativescript/core/globals';
import '@nativescript/angular/polyfills';
import '@nativescript/zone-js/dist/pre-zone-polyfills';
import 'zone.js/dist/zone.js';
import '@nativescript/zone-js';
import 'zone.js/dist/zone-testing.js';
import { NgModule } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NativeScriptTestingModule } from '@nativescript/angular/testing';
import { NativeScriptModule, platformNativescript } from '@nativescript/angular';
import { platformBrowserDynamicTesting } from '@angular/platform-browser-dynamic/testing';

TestBed.initTestEnvironment([NativeScriptTestingModule, NativeScriptModule], platformBrowserDynamicTesting());

@NgModule({})
export class Test {}
