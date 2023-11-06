import { installPolyfills } from "@nativescript/core/globals";

export const nsNgPolyfills = true;

// Angular 17 uses performance.mark in @angular/core
let loadTime = Date.now();
export const globalPolyfills = {
    performance: {
        now() {
            return Date.now() - loadTime;
        },
        mark(name: string, options: any) {
            // Note: we could add impl
        }
    }
}
global.registerModule('performance', () => globalPolyfills);
installPolyfills('performance', ['performance']);
