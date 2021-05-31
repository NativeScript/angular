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

  if (extractFromNSParent) {
    // const node = view.parentNode;
    detachViewFromParent(view);
    // view.parentNode = node;
  }
  return view;
}

export function detachViewFromParent(view: View) {
  const parent = <NgView>view?.parent;
  if (!parent) {
    return;
  }
  if (parent.meta && parent.meta.removeChild) {
    parent.meta.removeChild(parent, view);
  } else if (isLayout(parent)) {
    parent.removeChild(view);
  } else if (isContentView(parent) && parent.content === view) {
    parent.content = null;
  } else if (isView(parent)) {
    parent._removeView(view);
  }
}
