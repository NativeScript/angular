import { LayoutBase, View } from '@nativescript/core';
import { NgView, ViewClassMeta } from './view-types';
import { InvisibleNode } from './invisible-nodes';

export function isDetachedElement(element: View | NgView): boolean {
  return element && (<NgView>element).meta && (<NgView>element).meta.skipAddToDom;
}

export function isView(view: unknown): view is NgView {
  return view instanceof View;
}

export function isInvisibleNode(view: unknown): view is InvisibleNode {
  return view instanceof InvisibleNode;
}

export type ViewResolver = () => any;

export const elementMap = new Map<string, { resolver: ViewResolver; meta?: ViewClassMeta }>();
const camelCaseSplit = /([a-z0-9])([A-Z])/g;
const defaultViewMeta: ViewClassMeta = { skipAddToDom: false };

export function registerElement(elementName: string, resolver: ViewResolver, meta?: ViewClassMeta): void {
  const entry = { resolver, meta };
  elementMap.set(elementName, entry);
  elementMap.set(elementName.toLowerCase(), entry);
  elementMap.set(elementName.replace(camelCaseSplit, '$1-$2').toLowerCase(), entry);
}

export function getViewClass(elementName: string): any {
  const entry = elementMap.get(elementName) || elementMap.get(elementName.toLowerCase());
  if (!entry) {
    throw new TypeError(`No known component for element ${elementName}.`);
  }

  try {
    return entry.resolver();
  } catch (e) {
    throw new TypeError(`Could not load view for: ${elementName}.${e}`);
  }
}

export function getViewMeta(nodeName: string): ViewClassMeta {
  const entry = elementMap.get(nodeName) || elementMap.get(nodeName.toLowerCase());
  return (entry && entry.meta) || defaultViewMeta;
}

export function isKnownView(elementName: string): boolean {
  return elementMap.has(elementName) || elementMap.has(elementName.toLowerCase());
}

export function extractSingleViewRecursive(nodes: Array<any>, nestLevel: number): View {
  const actualNodes = nodes.filter((node) => !(node instanceof InvisibleNode));

  if (actualNodes.length === 0) {
    throw new Error(`No suitable views found in list template! ` + `Nesting level: ${nestLevel}`);
  } else if (actualNodes.length > 1) {
    throw new Error(`More than one view found in list template!` + `Nesting level: ${nestLevel}`);
  }

  const rootLayout = actualNodes[0];
  if (!rootLayout) {
    return extractSingleViewRecursive(rootLayout.children, nestLevel + 1);
  }

  const parentLayout = rootLayout.parent;
  if (parentLayout instanceof LayoutBase) {
    const node = rootLayout.parentNode;
    parentLayout.removeChild(rootLayout);
    rootLayout.parentNode = node;
  }

  return rootLayout;
}

export function getSingleViewRecursive(nodes: Array<any>, nestLevel: number): View {
  console.log('getSingleViewRecursive is deprecated, use extractSingleViewRecursive');
  return extractSingleViewRecursive(nodes, nestLevel);
}
