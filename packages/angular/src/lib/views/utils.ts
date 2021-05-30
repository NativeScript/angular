import { View } from '@nativescript/core';
import { InvisibleNode } from './invisible-nodes';
import { NgView } from './view-types';

export function isDetachedElement(element: View | NgView): boolean {
  return element && (<NgView>element).meta && (<NgView>element).meta.skipAddToDom;
}

export function isView(view: unknown): view is NgView {
  return view instanceof View;
}

export function isInvisibleNode(view: unknown): view is InvisibleNode {
  return view instanceof InvisibleNode;
}
