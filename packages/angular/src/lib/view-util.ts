import { View, unsetValue, Placeholder, ContentView, LayoutBase, ProxyViewContainer } from '@nativescript/core';
import { getViewClass, getViewMeta, isKnownView } from './element-registry';
import { CommentNode, NgView, TextNode, ViewExtensions, isDetachedElement, isInvisibleNode, isView, isContentView, isLayout } from './views';
import { NamespaceFilter } from './property-filter';

import { NativeScriptDebug } from './trace';
import { NgLayoutBase } from './views/view-types';

// Note: this utility exists from deep core import however results in
// Module not found: Error: Can't resolve '@nativescript/core/ui/core/properties'
function isCssVariable(property: string) {
  return /^--[^,\s]+?$/.test(property);
}

const ELEMENT_NODE_TYPE = 1;
const XML_ATTRIBUTES = Object.freeze(['style', 'rows', 'columns', 'fontAttributes']);
const whiteSpaceSplitter = /\s+/;

export type BeforeAttachAction = (view: View) => void;

function printNgTree(view: NgView) {
  let parent = view;
  while (parent.parent && (parent.parent as NgView).firstChild) {
    parent = parent.parent as NgView;
  }
  printChildrenRecurse(parent);
}
function printChildrenRecurse(parent: NgView) {
  const children = parent.firstChild ? [parent.firstChild, ...getChildrenSiblings(parent.firstChild).nextSiblings] : [];
  console.log(`parent: ${parent}, firstChild: ${parent.firstChild}, lastChild: ${parent.lastChild} children: ${children}`);
  if (parent.firstChild) {
    console.log(`----- start ${parent}`);
  }
  children.forEach((c) => printChildrenRecurse(c));
  if (parent.firstChild) {
    console.log(`----- end ${parent}`);
  }
}

function getChildrenSiblings(view: NgView) {
  const nextSiblings = [];
  const previousSiblings = [];
  let sibling = view.nextSibling;
  while (sibling) {
    nextSiblings.push(sibling);
    sibling = sibling.nextSibling;
  }
  sibling = view.previousSibling;
  while (sibling) {
    previousSiblings.push(sibling);
    sibling = sibling.previousSibling;
  }
  return {
    previousSiblings,
    nextSiblings,
  };
}

function printSiblingsTree(view: NgView) {
  const { previousSiblings, nextSiblings } = getChildrenSiblings(view);
  console.log(`${view} previousSiblings: ${previousSiblings} nextSiblings: ${nextSiblings}`);
}

const propertyMaps: Map<Function, Map<string, string>> = new Map<Function, Map<string, string>>();

export class ViewUtil {
  constructor(private namespaceFilters?: NamespaceFilter[], private reuseViews?: boolean) {}
  /**
   * Inserts a child into a parrent, preferably before next.
   * @param parent parent view
   * @param child child view to be added
   * @param previous previous element. If present, insert after this.
   * @param next next element. If present, insert before this (previous is ignored).
   */
  private insertChild(parent: View, child: View, previous?: NgView, next?: NgView) {
    if (!parent) {
      return;
    }

    const extendedParent = this.ensureNgViewExtensions(parent);
    const extendedChild = this.ensureNgViewExtensions(child);

    // if there's a next child, previous is the previousSibling of it
    if (next) {
      previous = next.previousSibling;
    } else if (previous) {
      // if there's a previous, next is the nextSibling of it
      next = previous.nextSibling;
    } else {
      // no previous or next, append to the parent
      previous = extendedParent.lastChild; // this can still be undefined if the parent has no children!
    }
    this.insertInList(extendedParent, extendedChild, previous, next);

    if (isDetachedElement(child) || isInvisibleNode(child)) {
      extendedChild.parentNode = extendedParent;
    }

    if (!isDetachedElement(child)) {
      const nextVisual = this.findNextVisual(next);
      this.addToVisualTree(extendedParent, extendedChild, nextVisual);
    } else if (isInvisibleNode(extendedChild)) {
      const nextVisual = this.findNextVisual(next);
      this.addInvisibleNode(extendedParent, extendedChild, nextVisual);
    }
    // printNgTree(extendedChild);
  }

  public insertBefore(parent: View, child: View, refChild?: View | NgView) {
    const extendedRef = refChild ? this.ensureNgViewExtensions(refChild) : undefined;
    this.insertChild(parent, child, undefined, extendedRef);
  }
  public insertAfter(parent: View, child: View, refChild?: View | NgView) {
    const extendedRef = refChild ? this.ensureNgViewExtensions(refChild) : undefined;
    this.insertChild(parent, child, extendedRef);
  }

  public appendChild(parent: View, child: View) {
    this.insertChild(parent, child);
  }

  /**
   * Inserts a view into the parent/sibling linked list
   * !WARNING: this method makes no checks to validate the integrity of previous/next children
   * @param parent parent view
   * @param child child view
   * @param previous previous element. null/undefined for first element
   * @param next next element. null/undefined for last element
   */
  private insertInList(parent: NgView, child: NgView, previous: NgView, next: NgView): void {
    if (NativeScriptDebug.isLogEnabled()) {
      NativeScriptDebug.viewUtilLog(`ViewUtil.insertInList parent: ${parent}, view: ${child}, ` + `previous: ${previous}, next: ${next}`);
    }

    if (previous) {
      previous.nextSibling = child;
      child.previousSibling = previous;
    } else {
      parent.firstChild = child;
    }

    if (next) {
      child.nextSibling = next;
      next.previousSibling = child;
    } else {
      parent.lastChild = child;
    }
  }

  private addToVisualTree(parent: NgView, child: NgView, next: NgView): void {
    if (NativeScriptDebug.isLogEnabled()) {
      NativeScriptDebug.viewUtilLog(`ViewUtil.addToVisualTree parent: ${parent}, view: ${child}, next: ${next}`);
    }

    if (parent.meta && parent.meta.insertChild) {
      parent.meta.insertChild(parent, child, next);
    } else if (isLayout(parent)) {
      this.insertToLayout(parent, child, next);
    } else if (isContentView(parent)) {
      parent.content = child;
    } else if (parent && (<any>parent)._addChildFromBuilder) {
      (<any>parent)._addChildFromBuilder(child.nodeName, child);
    }
  }

  private addInvisibleNode(parent: NgView, child: NgView, next: NgView): void {
    if (parent.meta?.insertInvisibleNode) {
      parent.meta.insertInvisibleNode(parent, child, next);
    } else {
      if (child instanceof TextNode) {
        (parent as any).text = child.text;
        child.registerTextChange((t) => ((parent as any).text = t), parent);
      }
    }
  }

  private insertToLayout(parent: NgLayoutBase, child: NgView, next: NgView): void {
    if (child.parent === parent) {
      this.removeLayoutChild(parent, child);
    }

    const nextVisual = this.findNextVisual(next);
    if (nextVisual) {
      const index = parent.getChildIndex(nextVisual);
      parent.insertChild(child, index);
    } else {
      parent.addChild(child);
    }
    // parent.eachChild((c) => {console.log(c); return true});
  }

  private findNextVisual(view: NgView): NgView {
    let next = view;
    while (next && isDetachedElement(next)) {
      next = next.nextSibling;
    }

    return next;
  }

  public removeChild(parent: View, child: View) {
    if (NativeScriptDebug.isLogEnabled()) {
      NativeScriptDebug.viewUtilLog(`ViewUtil.removeChild parent: ${parent} child: ${child}`);
    }

    if (!parent) {
      return;
    }

    const extendedParent = this.ensureNgViewExtensions(parent);
    const extendedChild = this.ensureNgViewExtensions(child);
    extendedChild.parentNode = null;

    this.removeFromList(extendedParent, extendedChild);
    if (!isDetachedElement(extendedChild)) {
      this.removeFromVisualTree(extendedParent, extendedChild);
    } else if (isInvisibleNode(extendedChild)) {
      this.removeInvisibleNode(extendedParent, extendedChild);
    }
  }

  private removeFromList(parent: NgView, child: NgView) {
    if (NativeScriptDebug.isLogEnabled()) {
      NativeScriptDebug.viewUtilLog(`ViewUtil.removeFromList parent: ${parent} child: ${child}`);
    }

    if (parent.firstChild === child && parent.lastChild === child) {
      parent.firstChild = null;
      parent.lastChild = null;
      child.nextSibling = null;
      child.previousSibling = null;
      return;
    }

    if (parent.firstChild === child) {
      parent.firstChild = child.nextSibling;
    }

    const previous = child.previousSibling;
    if (parent.lastChild === child) {
      parent.lastChild = previous;
    }

    if (previous) {
      previous.nextSibling = child.nextSibling;
      if (child.nextSibling) {
        child.nextSibling.previousSibling = previous;
      }
    }

    child.nextSibling = null;
    child.previousSibling = null;
  }

  // NOTE: This one is O(n) - use carefully
  private findPreviousElement(parent: NgView, child: NgView): NgView {
    if (NativeScriptDebug.isLogEnabled()) {
      NativeScriptDebug.viewUtilLog(`ViewUtil.findPreviousElement parent: ${parent} child: ${child}`);
    }

    let previousVisual;
    if (isLayout(parent)) {
      previousVisual = this.getPreviousVisualElement(parent, child);
    }

    let previous = previousVisual || parent.firstChild;

    // since detached elements are not added to the visual tree,
    // we need to find the actual previous sibling of the view,
    // which may as well be an invisible node
    while (previous && previous !== child && previous.nextSibling !== child) {
      previous = previous.nextSibling;
    }

    return previous;
  }

  private getPreviousVisualElement(parent: NgLayoutBase, child: NgView): NgView {
    const elementIndex = parent.getChildIndex(child);

    if (elementIndex > 0) {
      return parent.getChildAt(elementIndex - 1) as NgView;
    }
  }

  // NOTE: This one is O(n) - use carefully
  public getChildIndex(parent: any, child: NgView) {
    if (isLayout(parent)) {
      return parent.getChildIndex(child);
    } else if (isContentView(parent)) {
      return child === parent.content ? 0 : -1;
    }
  }

  private removeFromVisualTree(parent: NgView, child: NgView) {
    if (NativeScriptDebug.isLogEnabled()) {
      NativeScriptDebug.viewUtilLog(`ViewUtil.removeFromVisualTree parent: ${parent} child: ${child}`);
    }

    if (parent.meta && parent.meta.removeChild) {
      parent.meta.removeChild(parent, child);
    } else if (isLayout(parent)) {
      this.removeLayoutChild(parent, child);
    } else if (isContentView(parent) && parent.content === child) {
      parent.content = null;
    } else if (isView(parent)) {
      parent._removeView(child);
    }
  }

  private removeInvisibleNode(parent: NgView, child: NgView) {
    if (parent.meta?.removeInvisibleNode) {
      parent.meta.removeInvisibleNode(parent, child);
    } else {
      if (child instanceof TextNode) {
        child.unregisterTextChange(parent);
      }
    }
  }

  private removeLayoutChild(parent: NgLayoutBase, child: NgView): void {
    if (NativeScriptDebug.isLogEnabled()) {
      NativeScriptDebug.viewUtilLog(`ViewUtil.removeLayoutChild parent: ${parent} child: ${child}`);
    }

    const index = parent.getChildIndex(child);

    if (index !== -1) {
      parent.removeChild(child);
    }
  }

  public createComment(value: string): CommentNode {
    return new CommentNode(value);
  }

  public createText(value: string): TextNode {
    return new TextNode(value);
  }

  public createView(name: string): NgView {
    const originalName = name;
    if (!isKnownView(name)) {
      name = 'ProxyViewContainer';
    }

    if (NativeScriptDebug.isLogEnabled()) {
      NativeScriptDebug.viewUtilLog(`Creating view: ${originalName} ${name}`);
    }

    const viewClass = getViewClass(name);
    const view = <NgView>new viewClass();
    const ngView = this.setNgViewExtensions(view, name);
    ngView.reusable = !!this.reuseViews;

    return ngView;
  }

  private ensureNgViewExtensions(view: View): NgView {
    if (view.hasOwnProperty('meta')) {
      return view as NgView;
    } else {
      const name = view.cssType;
      const ngView = this.setNgViewExtensions(view, name);

      return ngView;
    }
  }

  private setNgViewExtensions(view: View, name: string): NgView {
    if (NativeScriptDebug.isLogEnabled()) {
      NativeScriptDebug.viewUtilLog(`Make into a NgView view: ${view} name: "${name}"`);
    }

    const ngView = view as NgView;
    ngView.nodeName = name;
    ngView.meta = getViewMeta(name);

    // we're setting the node type of the view
    // to 'element' because of checks done in the
    // dom animation engine
    ngView.nodeType = ELEMENT_NODE_TYPE;

    return ngView;
  }

  public setProperty(view: NgView, attributeName: string, value: any, namespace?: string): void {
    if (!view || (namespace && !this.runsIn(namespace))) {
      return;
    }

    if (attributeName.indexOf('.') !== -1) {
      // Handle nested properties
      const properties = attributeName.split('.');
      attributeName = properties[properties.length - 1];

      let propMap = this.getProperties(view);
      let i = 0;
      while (i < properties.length - 1 && typeof view !== 'undefined') {
        let prop = properties[i];
        if (propMap.has(prop)) {
          prop = propMap.get(prop);
        }

        view = view[prop];
        propMap = this.getProperties(view);
        i++;
      }
    }

    if (typeof view !== 'undefined') {
      this.setPropertyInternal(view, attributeName, value);
    }
  }

  private runsIn(platform: string): boolean {
    let runs = true;
    const last = () => true;
    if (this.namespaceFilters) {
      let chain = (p: string) => true;
      for (let i = this.namespaceFilters.length - 1; i >= 0; i--) {
        const currentChain = chain;
        chain = (p) => this.namespaceFilters[i].runsIn(p, currentChain);
      }
      runs = chain(platform);
      runs = runs !== false ? true : false; // undefined means true
      // this.namespaceFilters.some((filter) => {
      // 	const runsInFilter = filter.runsIn(platform);
      // 	if (runsInFilter !== undefined) {
      // 		runs = runsInFilter;
      // 		return true;
      // 	}
      // });
    }
    return runs;
  }

  private setPropertyInternal(view: NgView, attributeName: string, value: any): void {
    if (NativeScriptDebug.isLogEnabled()) {
      NativeScriptDebug.viewUtilLog(`Setting attribute: ${attributeName}=${value} to ${view}`);
    }

    if (attributeName === 'class') {
      this.setClasses(view, value);
      return;
    }

    if (XML_ATTRIBUTES.indexOf(attributeName) !== -1) {
      view[attributeName] = value;
      return;
    }

    const propMap = this.getProperties(view);
    const propertyName = propMap.get(attributeName);

    // Ensure the children of a collection currently have no parent set.
    if (Array.isArray(value)) {
      this.removeParentReferencesFromItems(value);
    }

    if (propertyName) {
      // We have a lower-upper case mapped property.
      view[propertyName] = value;
      return;
    }

    // Unknown attribute value -- just set it to our object as is.
    view[attributeName] = value;
  }

  private removeParentReferencesFromItems(items: any[]): void {
    for (const item of items) {
      if (item.parent && item.parentNode) {
        if (NativeScriptDebug.isLogEnabled()) {
          NativeScriptDebug.viewUtilLog(`Unassigning parent ${item.parentNode} on value: ${item}`);
        }
        item.parent = undefined;
        item.parentNode = undefined;
      }
    }
  }

  private getProperties(instance: any): Map<string, string> {
    const type = instance && instance.constructor;
    if (!type) {
      return new Map<string, string>();
    }

    if (!propertyMaps.has(type)) {
      let propMap = new Map<string, string>();
      for (let propName in instance) {
        // tslint:disable:forin
        propMap.set(propName.toLowerCase(), propName);
      }
      propertyMaps.set(type, propMap);
    }

    return propertyMaps.get(type);
  }

  private cssClasses(view: NgView) {
    if (!view.ngCssClasses) {
      view.ngCssClasses = new Map<string, boolean>();
    }
    return view.ngCssClasses;
  }

  public addClass(view: View | NgView, className: string): void {
    const extendedView = this.ensureNgViewExtensions(view);
    this.cssClasses(extendedView).set(className, true);
    this.syncClasses(extendedView);
  }

  public removeClass(view: View, className: string): void {
    const extendedView = this.ensureNgViewExtensions(view);
    this.cssClasses(extendedView).delete(className);
    this.syncClasses(extendedView);
  }

  private setClasses(view: NgView, classesValue: string): void {
    let classes = classesValue.split(whiteSpaceSplitter);
    this.cssClasses(view).clear();
    classes.forEach((className) => this.cssClasses(view).set(className, true));
    this.syncClasses(view);
  }

  private syncClasses(view: NgView): void {
    let classValue = (<any>Array).from(this.cssClasses(view).keys()).join(' ');
    view.className = classValue;
  }

  public setStyle(view: View, styleName: string, value: any) {
    if (isCssVariable(styleName)) {
      view.style.setUnscopedCssVariable(styleName, value);
      view._onCssStateChange();
    } else {
      view.style[styleName] = value;
    }
  }

  public removeStyle(view: View, styleName: string) {
    if (isCssVariable(styleName)) {
      // TODO: expose this on core
      (view.style as any).unscopedCssVariables.delete(styleName);
      view._onCssStateChange();
    } else {
      view.style[styleName] = unsetValue;
    }
  }
}
