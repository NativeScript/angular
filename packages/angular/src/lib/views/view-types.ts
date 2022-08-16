import { ContentView, LayoutBase, Placeholder, View } from '@nativescript/core';

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

export interface ViewClassMeta {
  skipAddToDom?: boolean;
  insertChild?: (parent: any, child: any, next?: any) => void;
  removeChild?: (parent: any, child: any) => void;
  insertInvisibleNode?: (parent: any, child: any, next?: any) => void;
  removeInvisibleNode?: (parent: any, child: any) => void;
}

export type NgLayoutBase = LayoutBase & ViewExtensions;
export type NgContentView = ContentView & ViewExtensions;
export type NgPlaceholder = Placeholder & ViewExtensions;
