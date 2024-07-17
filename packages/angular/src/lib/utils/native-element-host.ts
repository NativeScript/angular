import { Type, reflectComponentType } from '@angular/core';
import { GridLayout, View } from '@nativescript/core';
import { registerElement } from '../element-registry/registry';

function createClass<T extends { new (...args: any[]): any }>(className: string, extendsClassName: T) {
  return { [className]: class extends extendsClassName {} }[className];
}

export function NativeElementHost(
  fn: () => typeof View,
  {
    forcedSelector,
    createProxyClass = true,
  }: {
    forcedSelector?: string;
    createProxyClass?: boolean;
  } = {},
) {
  return function <T extends Type<any>>(v: T) {
    ((forcedSelector || reflectComponentType(v)?.selector)?.split(',') || [])
      .map((v) => v.trim())
      .filter((v) => !v.includes('['))
      .forEach((selector) => {
        if (createProxyClass) {
          let cachedCls: typeof View;
          registerElement(selector, () => {
            if (!cachedCls) {
              cachedCls = createClass(selector, fn() as any);
            }
            return cachedCls;
          });
        } else {
          registerElement(selector, fn);
        }
      });
  };
}
