// placeholder for when we actually need some polyfills

import { installPolyfills } from "@nativescript/core/globals";

export const nsNgPolyfills = true;
let loadTime = Date.now();
export const globalPolyfills = {
    performance: {
        now() {
            return Date.now() - loadTime;
        },
        mark(name: string, options: any) {

        }
    }
}
global.registerModule('performance', () => globalPolyfills);
installPolyfills('performance', ['performance']);
