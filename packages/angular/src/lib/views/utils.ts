import { ContentView, LayoutBase, ProxyViewContainer, View } from '@nativescript/core';
import { InvisibleNode } from './invisible-nodes';
import type { NgContentView, NgLayoutBase, NgView } from './view-types';

export function isDetachedElement(element: View | NgView): boolean {
  return element && (<NgView>element).meta && (<NgView>element).meta.skipAddToDom;
}

export function isView(view: unknown): view is NgView {
  return view instanceof View;
}

export function isInvisibleNode(view: unknown): view is InvisibleNode {
  return view instanceof InvisibleNode;
}

export function isLayout(view: unknown): view is NgLayoutBase {
  return view instanceof LayoutBase;
}

export function isContentView(view: unknown): view is NgContentView {
  return view instanceof ContentView;
}

export function getFirstNativeLikeView(view: View, extractFromNSParent = false) {
  if (view instanceof ProxyViewContainer) {
    if (view.getChildrenCount() === 0) {
      return null;
    }
    return getFirstNativeLikeView(view.getChildAt(0));
  }
  if (isContentView(view)) {
    return getFirstNativeLikeView(view.content);
  }
  const parentLayout = view?.parent;
  if (extractFromNSParent && parentLayout instanceof LayoutBase) {
    const node = view.parentNode;
    parentLayout.removeChild(view);
    view.parentNode = node;
  }
  return view;
}
