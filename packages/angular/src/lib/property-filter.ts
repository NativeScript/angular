import { Injectable } from "@angular/core";
import { Device, platformNames } from "@nativescript/core";


export interface NamespaceFilter {
    runsIn(namespace: string, next: (namespace: string) => boolean | undefined): boolean | undefined;
}

export class PlatformNamespaceFilter implements NamespaceFilter {
    runsIn(namespace: string, next: (namespace: string) => boolean | undefined): boolean | undefined {
        return ((namespace === "android" && Device.os === platformNames.android) || (namespace === "ios" && Device.os === platformNames.ios)) ? true : next(namespace);
    }
}
