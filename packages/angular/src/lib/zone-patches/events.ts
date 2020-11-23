import "./core";

import { Observable, View } from '@nativescript/core';
import { patchEventListeners } from './utils';



patchEventListeners(Observable);
patchEventListeners(View);
