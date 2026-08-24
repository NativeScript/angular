import { Application } from '@nativescript/core';
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

/**
 * Resolves once `condition` is truthy, polling on each frame. Unlike a fixed delay this resolves
 * as soon as the awaited state is reached (e.g. a modal finishing its animated dismissal), with a
 * bounded safety timeout so a stuck condition can't hang the suite.
 */
export function waitUntil(condition: () => boolean, timeout = 5000): Promise<void> {
  return new Promise((resolve, reject) => {
    const start = Date.now();
    const check = () => {
      if (condition()) {
        resolve();
      } else if (Date.now() - start > timeout) {
        reject(new Error('Timed out waiting for condition'));
      } else {
        setTimeout(check, 16);
      }
    };
    check();
  });
}

/**
 * Returns true while any ancestor view controller of `view` is still presenting modally.
 * Only meaningful on iOS; on Android there is no `viewController` and this returns false.
 */
export function isPresentingModally(view: View): boolean {
  let current = view;
  while (current) {
    if ((current as { viewController?: { presentedViewController?: unknown } }).viewController?.presentedViewController) {
      return true;
    }
    current = current.parent as View;
  }
  return false;
}

/** The most recently presented modal view still tracked in core's global registry. */
export function topRootModalView(): View | undefined {
  const modals = ((Application.getRootView()?._getRootModalViews() ?? []) as View[]).slice();
  return modals[modals.length - 1];
}

/**
 * Close any modal still presented (via core's global registry) and wait until it has actually
 * finished dismissing before the next test runs.
 *
 * Note: `closeModal()` removes the modal from `_rootModalViews` *synchronously*, before the
 * animated dismissal starts, so the registry being empty does NOT mean the modal is gone. On
 * iOS the parent keeps a `presentedViewController` until the dismiss animation completes — and
 * that's exactly what makes the next `showModal` fail with "already presenting" — so wait on it.
 */
export async function closeRemainingModals(): Promise<void> {
  const open = ((Application.getRootView()?._getRootModalViews() ?? []) as View[]).slice();
  // Capture parents before closing: `closeModal()` nulls `_modalParent` synchronously.
  const parents = open
    .map((modal) => (modal as { _modalParent?: View })._modalParent)
    .filter((parent): parent is View => !!parent);
  open.forEach((modal) => modal.closeModal());
  await waitUntil(() => parents.every((parent) => !isPresentingModally(parent))).catch(() => undefined);
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
