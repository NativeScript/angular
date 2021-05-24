import { Frame, LayoutBase, Page, View } from '@nativescript/core';

export interface ViewClass {
  new (): View;
}
export interface ViewExtensions {
  meta: ViewClassMeta;
  nodeType: number;
  nodeName: string;
  parentNode: NgView;
  nextSibling: NgView;
  previousSibling: NgView;
  firstChild: NgView;
  lastChild: NgView;
  ngCssClasses: Map<string, boolean>;
}

export type NgView = View & ViewExtensions;

export abstract class InvisibleNode extends View implements NgView {
  meta: { skipAddToDom: boolean };
  nodeType: number;
  nodeName: string;
  parentNode: NgView;
  nextSibling: NgView;
  previousSibling: NgView;
  firstChild: NgView;
  lastChild: NgView;
  ngCssClasses: Map<string, boolean>;

  constructor(protected name: string = '') {
    super();

    this.nodeType = 1;
    this.nodeName = getClassName(this);
  }

  toString() {
    return `${this.nodeName}(${this.id})-${this.name}`;
  }
}

export class CommentNode extends InvisibleNode {
  protected static id = 0;

  constructor(value?: string) {
    super(value);

    this.meta = {
      skipAddToDom: true,
    };
    this.id = CommentNode.id.toString();
    CommentNode.id += 1;
  }
}

export class TextNode extends InvisibleNode {
  protected static id = 0;

  constructor(value?: string) {
    super(value);

    this.meta = {
      skipAddToDom: true,
    };
    this.id = TextNode.id.toString();
    TextNode.id += 1;
  }
}

const getClassName = (instance) => instance.constructor.name;

export interface ViewClassMeta {
  skipAddToDom?: boolean;
  insertChild?: (parent: any, child: any, next?: any) => void;
  removeChild?: (parent: any, child: any) => void;
}

export function isDetachedElement(element): boolean {
  return element && element.meta && element.meta.skipAddToDom;
}

export function isView(view: any): view is NgView {
  return view instanceof View;
}

export function isInvisibleNode(view: any): view is InvisibleNode {
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

export function getSingleViewRecursive(nodes: Array<any>, nestLevel: number): View {
  const actualNodes = nodes.filter((node) => !(node instanceof InvisibleNode));

  if (actualNodes.length === 0) {
    throw new Error(`No suitable views found in list template! ` + `Nesting level: ${nestLevel}`);
  } else if (actualNodes.length > 1) {
    throw new Error(`More than one view found in list template!` + `Nesting level: ${nestLevel}`);
  }

  const rootLayout = actualNodes[0];
  if (!rootLayout) {
    return getSingleViewRecursive(rootLayout.children, nestLevel + 1);
  }

  const parentLayout = rootLayout.parent;
  if (parentLayout instanceof LayoutBase) {
    let node = rootLayout.parentNode;
    parentLayout.removeChild(rootLayout);
    rootLayout.parentNode = node;
  }

  return rootLayout;
}

const frameMeta: ViewClassMeta = {
  insertChild: (parent: Frame, child: NgView, next: any) => {
    // Page cannot be added to Frame with _addChildFromBuilder (thwos "use defaultPage" error)
    if (isInvisibleNode(child)) {
      return;
    } else if (child instanceof Page) {
      parent.navigate({ create: () => child });
    } else {
      throw new Error('Only a Page can be a child of Frame');
    }
  },
};
