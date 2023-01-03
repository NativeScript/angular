import { View } from '@nativescript/core/ui/core/view';
import { TextBase } from '@nativescript/core/ui/text-base';
import { Device } from '@nativescript/core/platform';

function getChildren(view: View): Array<View> {
  const children: Array<View> = [];
  (<any>view).eachChildView((child) => {
    children.push(child);
    return true;
  });
  return children;
}

export function dumpView(view: View, verbose: boolean = false): string {
  let nodeName: string = (<any>view).nodeName;
  if (!nodeName) {
    // Strip off the source
    nodeName = view.toString().replace(/(@[^;]*;)/g, '');
  }
  nodeName = nodeName.toLocaleLowerCase();

  const output = ['(', nodeName];
  if (verbose) {
    if (view instanceof TextBase) {
      output.push('[text=', view.text, ']');
    }
  }

  const children = getChildren(view)
    .map((c) => dumpView(c, verbose))
    .join(', ');
  if (children) {
    output.push(' ', children);
  }

  output.push(')');
  return output.join('');
}

export function createDevice(os: string): typeof Device {
  return {
    os: os,
    osVersion: '0',
    deviceType: 'Phone',
    language: 'en',
    uuid: '0000',
    sdkVersion: '0',
    region: 'US',
    manufacturer: 'tester',
    model: 'test device',
  };
}
