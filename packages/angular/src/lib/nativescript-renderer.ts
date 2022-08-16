import { Inject, Injectable, NgZone, Optional, Renderer2, RendererFactory2, RendererStyleFlags2, RendererType2, ViewEncapsulation } from '@angular/core';
import { addTaggedAdditionalCSS, Application, ContentView, Device, getViewById, Observable, profile, Utils, View } from '@nativescript/core';
import { getViewClass, isKnownView } from './element-registry';
import { getFirstNativeLikeView, NgView, TextNode } from './views';

import { NamespaceFilter, NAMESPACE_FILTERS } from './property-filter';
import { APP_ROOT_VIEW, ENABLE_REUSABE_VIEWS, NATIVESCRIPT_ROOT_MODULE_ID } from './tokens';
import { NativeScriptDebug } from './trace';
import { ViewUtil } from './view-util';

const addStyleToCss = profile('"renderer".addStyleToCss', function addStyleToCss(style: string, tag?: string | number): void {
  if (tag) {
    addTaggedAdditionalCSS(style, tag);
  } else {
    Application.addCss(style);
  }
});

function runInRootZone<T>(fn: () => T): T {
  if (typeof Zone === 'undefined') {
    return fn();
  }
  return Zone.root.run(fn);
}

function inRootZone() {
  return function (target: Object, key: string | symbol, descriptor: PropertyDescriptor) {
    const childFunction = descriptor.value;
    descriptor.value = function (...args: any[]) {
      const fn = childFunction.bind(this);
      return runInRootZone(() => fn(...args));
    };
    return descriptor;
  };
}

export class NativeScriptRendererFactory implements RendererFactory2 {
  private componentRenderers = new Map<string, Renderer2>();
  private defaultRenderer: Renderer2;
  // backwards compatibility with RadListView
  private viewUtil = new ViewUtil(this.namespaceFilters, this.reuseViews);

  constructor(@Inject(APP_ROOT_VIEW) private rootView: View, @Inject(NAMESPACE_FILTERS) private namespaceFilters: NamespaceFilter[], @Inject(NATIVESCRIPT_ROOT_MODULE_ID) private rootModuleID: string | number, @Optional() @Inject(ENABLE_REUSABE_VIEWS) private reuseViews) {
    if (typeof this.reuseViews !== 'boolean') {
      this.reuseViews = false; // default to false
    }
    this.defaultRenderer = new NativeScriptRenderer(rootView, namespaceFilters, this.reuseViews);
  }
  createRenderer(hostElement: any, type: RendererType2): Renderer2 {
    if (NativeScriptDebug.enabled) {
      NativeScriptDebug.rendererLog(`NativeScriptRendererFactory.createRenderer ${hostElement}. type.id: ${type.id} type.encapsulation: ${type.encapsulation}`);
    }
    if (!hostElement || !type) {
      return this.defaultRenderer;
    }

    let renderer = this.componentRenderers.get(type.id);
    /**
     *! WARNING
     *! We're reusing the renderer for the components
     *! this might cause unexpected behavior as the "rootView" is an arbitrary hostElement
     *! also, the renderer has it's .destroy() called!
     *! might be useful to create a BaseEmulatedRender and a ProxyEmulatedRender
     *! every component type gets a BaseEmulatedRender (singleton) which is passed to ProxyEmulatedRender
     *! ProxyEmulatedRenderer registers with BaseEmulatedRender so we can clean up things like CSS when it's not needed
     *! this might be useful if we find a way to HMR component styling without a full rebootstrap
     */
    if (renderer) {
      if (renderer instanceof EmulatedRenderer) {
        renderer.applyToHost(hostElement);
      }

      return renderer;
    }

    if (type.encapsulation === ViewEncapsulation.None) {
      type.styles.map((s) => s.toString()).forEach((v) => addStyleToCss(v, this.rootModuleID));
      renderer = this.defaultRenderer;
    } else {
      renderer = new EmulatedRenderer(type, hostElement, this.namespaceFilters, this.rootModuleID, this.reuseViews);
      (<EmulatedRenderer>renderer).applyToHost(hostElement);
    }

    this.componentRenderers.set(type.id, renderer);
    return renderer;
  }
  // begin?(): void {
  //     throw new Error("Method not implemented.");
  // }
  // end?(): void {
  //     throw new Error("Method not implemented.");
  // }
  whenRenderingDone(): Promise<any> {
    if (!this.rootView) {
      return Promise.resolve();
    }
    return new Promise<void>((resolve) => {
      let interval: any = 0;
      function scheduleResolve() {
        // iOS really hates synchronous things...
        // Utils.queueMacrotask(resolve);
        setTimeout(resolve, 15);
      }
      function fireWhenLoaded() {
        const view = rootFactory();
        if (view.isLoaded) {
          scheduleResolve();
        } else {
          view.once('loaded', scheduleResolve);
        }
      }
      const rootFactory = () => (this.rootView instanceof ContentView ? this.rootView.content : this.rootView);
      if (!rootFactory()) {
        interval = setInterval(() => {
          if (rootFactory()) {
            clearInterval(interval);
            fireWhenLoaded();
          }
        }, 10);
      } else {
        fireWhenLoaded();
      }
    });
    // throw new Error("Method not implemented.");
  }
}

class NativeScriptRenderer implements Renderer2 {
  private viewUtil = new ViewUtil(this.namespaceFilters, this.reuseViews);

  constructor(private rootView: View, private namespaceFilters?: NamespaceFilter[], private reuseViews?: boolean) {}
  get data(): { [key: string]: any } {
    throw new Error('Method not implemented.');
  }
  destroy(): void {
    if (NativeScriptDebug.enabled) {
      NativeScriptDebug.rendererLog('NativeScriptRenderer.destroy');
    }
  }
  @inRootZone()
  createElement(name: string, namespace?: string) {
    if (NativeScriptDebug.enabled) {
      NativeScriptDebug.rendererLog(`NativeScriptRenderer.createElement: ${name}`);
    }
    let oldName;
    if (!isKnownView(name)) {
      oldName = name;
      name = 'ProxyViewContainer';
    }
    const view = this.viewUtil.createView(name);
    if (oldName) {
      (view as any).customCSSName = oldName;
    }
    return view;
  }
  @inRootZone()
  createComment(value: string) {
    if (NativeScriptDebug.enabled) {
      NativeScriptDebug.rendererLog(`NativeScriptRenderer.createComment ${value}`);
    }
    return this.viewUtil.createComment(value);
  }
  @inRootZone()
  createText(value: string) {
    if (NativeScriptDebug.enabled) {
      NativeScriptDebug.rendererLog(`NativeScriptRenderer.createText ${value}`);
    }
    return this.viewUtil.createText(value);
  }
  destroyNode: (node: any) => void = (node: View) =>
    runInRootZone(() => {
      if (NativeScriptDebug.enabled) {
        NativeScriptDebug.rendererLog(`NativeScriptRenderer.destroyNode node: ${node}`);
      }
      if (node?.destroyNode) {
        node?.destroyNode();
      }
    });
  @inRootZone()
  appendChild(parent: View, newChild: View): void {
    if (NativeScriptDebug.enabled) {
      NativeScriptDebug.rendererLog(`NativeScriptRenderer.appendChild child: ${newChild} parent: ${parent}`);
    }
    this.viewUtil.appendChild(parent, newChild);
  }
  @inRootZone()
  insertBefore(parent: any, newChild: any, refChild: any): void {
    if (NativeScriptDebug.enabled) {
      NativeScriptDebug.rendererLog(`NativeScriptRenderer.insertBefore child: ${newChild} ` + `parent: ${parent} refChild: ${refChild}`);
    }
    this.viewUtil.insertBefore(parent, newChild, refChild);
  }
  @inRootZone()
  removeChild(parent: any, oldChild: any, isHostElement?: boolean): void {
    if (NativeScriptDebug.enabled) {
      NativeScriptDebug.rendererLog(`NativeScriptRenderer.removeChild child: ${oldChild} parent: ${parent}`);
    }
    this.viewUtil.removeChild(parent, oldChild);
  }
  selectRootElement(selectorOrNode: any, preserveContent?: boolean) {
    if (NativeScriptDebug.enabled) {
      NativeScriptDebug.rendererLog(`NativeScriptRenderer.selectRootElement: ${selectorOrNode}`);
    }
    if (selectorOrNode instanceof View) {
      return selectorOrNode;
    }
    if (selectorOrNode && selectorOrNode[0] === '#') {
      const result = getViewById(this.rootView, selectorOrNode.slice(1));
      return (result || this.rootView) as View;
    }
    if (typeof selectorOrNode === 'string') {
      const view = this.viewUtil.createView(selectorOrNode);
      if (getFirstNativeLikeView(view) === view) {
        // view is nativelike!
        this.appendChild(this.rootView, view);
        return view;
      }
    }
    return this.rootView;
  }
  parentNode(node: NgView) {
    if (NativeScriptDebug.enabled) {
      NativeScriptDebug.rendererLog(`NativeScriptRenderer.parentNode for node: ${node} is ${node.parentNode}`);
    }
    return node.parentNode;
  }
  nextSibling(node: NgView) {
    if (NativeScriptDebug.enabled) {
      NativeScriptDebug.rendererLog(`NativeScriptRenderer.nextSibling of ${node} is ${node.nextSibling}`);
    }
    return node.nextSibling;
  }
  @inRootZone()
  setAttribute(el: any, name: string, value: string, namespace?: string): void {
    if (NativeScriptDebug.enabled) {
      NativeScriptDebug.rendererLog(`NativeScriptRenderer.setAttribute ${namespace ? namespace + ':' : ''}${el}.${name} = ${value}`);
    }
    this.viewUtil.setProperty(el, name, value, namespace);
  }
  removeAttribute(el: any, name: string, namespace?: string): void {
    if (NativeScriptDebug.enabled) {
      NativeScriptDebug.rendererLog(`NativeScriptRenderer.removeAttribute ${namespace ? namespace + ':' : ''}${el}.${name}`);
    }
  }
  @inRootZone()
  addClass(el: any, name: string): void {
    if (NativeScriptDebug.enabled) {
      NativeScriptDebug.rendererLog(`NativeScriptRenderer.addClass ${name}`);
    }
    this.viewUtil.addClass(el, name);
  }
  @inRootZone()
  removeClass(el: any, name: string): void {
    if (NativeScriptDebug.enabled) {
      NativeScriptDebug.rendererLog(`NativeScriptRenderer.removeClass ${name}`);
    }
    this.viewUtil.removeClass(el, name);
  }
  @inRootZone()
  setStyle(el: any, style: string, value: any, flags?: RendererStyleFlags2): void {
    if (NativeScriptDebug.enabled) {
      NativeScriptDebug.rendererLog(`NativeScriptRenderer.setStyle: ${el}, ${style} = ${value}`);
    }
    this.viewUtil.setStyle(el, style, value);
  }
  @inRootZone()
  removeStyle(el: any, style: string, flags?: RendererStyleFlags2): void {
    if (NativeScriptDebug.enabled) {
      NativeScriptDebug.rendererLog('NativeScriptRenderer.removeStyle: ${styleName}');
    }
    this.viewUtil.removeStyle(el, style);
  }
  @inRootZone()
  setProperty(el: any, name: string, value: any): void {
    if (NativeScriptDebug.enabled) {
      NativeScriptDebug.rendererLog(`NativeScriptRenderer.setProperty ${el}.${name} = ${value}`);
    }
    this.viewUtil.setProperty(el, name, value);
  }
  setValue(node: any, value: string): void {
    if (NativeScriptDebug.enabled) {
      NativeScriptDebug.rendererLog(`NativeScriptRenderer.setValue renderNode: ${node}, value: ${value}`);
    }
    if (node instanceof TextNode) {
      node.text = value;
    }
    // throw new Error("Method not implemented.");
  }
  listen(target: View, eventName: string, callback: (event: any) => boolean | void): () => void {
    // throw new Error("Method not implemented.");
    if (NativeScriptDebug.enabled) {
      NativeScriptDebug.rendererLog(`NativeScriptRenderer.listen: ${eventName}`);
    }
    target.on(eventName, callback);
    if (eventName === View.loadedEvent && target.isLoaded) {
      // we must create a new obervable here to ensure that the event goes through whatever zone patches are applied
      const obs = new Observable();
      obs.once(eventName, callback);
      obs.notify({
        eventName,
        object: target,
      });
    }
    return () => target.off(eventName, callback);
  }
}

// CONTENT_ATTR not exported from nativescript-renderer - we need it for styles application.
const COMPONENT_REGEX = /%COMP%/g;
const ATTR_SANITIZER = /-/g;
export const COMPONENT_VARIABLE = '%COMP%';
export const HOST_ATTR = `_nghost-${COMPONENT_VARIABLE}`;
export const CONTENT_ATTR = `_ngcontent-${COMPONENT_VARIABLE}`;

const replaceNgAttribute = function (input: string, componentId: string): string {
  return input.replace(COMPONENT_REGEX, componentId);
};

const addScopedStyleToCss = profile(`"renderer".addScopedStyleToCss`, function addScopedStyleToCss(style: string, tag?: number | string): void {
  if (tag) {
    addTaggedAdditionalCSS(style, tag);
  } else {
    Application.addCss(style);
  }
});

@Injectable()
export class EmulatedRenderer extends NativeScriptRenderer {
  private contentAttr: string;
  private hostAttr: string;

  constructor(component: RendererType2, rootView: View, namespaceFilters: NamespaceFilter[], private rootModuleId: string | number, reuseViews: boolean) {
    super(rootView, namespaceFilters, reuseViews);

    const componentId = component.id.replace(ATTR_SANITIZER, '_');
    this.contentAttr = replaceNgAttribute(CONTENT_ATTR, componentId);
    this.hostAttr = replaceNgAttribute(HOST_ATTR, componentId);
    this.addStyles(component.styles, componentId);
  }

  applyToHost(view: NgView) {
    super.setAttribute(view, this.hostAttr, '');
  }

  appendChild(parent: any, newChild: NgView): void {
    super.appendChild(parent, newChild);
  }

  createElement(parent: any, name: string): NgView {
    const view = super.createElement(parent, name);

    // Set an attribute to the view to scope component-specific css.
    // The property name is pre-generated by Angular.
    super.setAttribute(view, this.contentAttr, '');

    return view;
  }

  @profile
  private addStyles(styles: (string | any[])[], componentId: string) {
    styles
      .map((s) => s.toString())
      .map((s) => replaceNgAttribute(s, componentId))
      .forEach((s) => addScopedStyleToCss(s, this.rootModuleId));
  }
}
