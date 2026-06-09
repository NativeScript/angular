import {
  inject,
  Injectable,
  Injector,
  Renderer2,
  RendererFactory2,
  RendererStyleFlags2,
  RendererType2,
  runInInjectionContext,
  ViewEncapsulation,
} from '@angular/core';
import {
  addTaggedAdditionalCSS,
  Application,
  ContentView,
  getViewById,
  Observable,
  profile,
  View,
} from '@nativescript/core';
import { isKnownView } from './element-registry';
import { NAMESPACE_FILTERS } from './property-filter';
import {
  APP_ROOT_VIEW,
  ENABLE_REUSABE_VIEWS,
  NATIVESCRIPT_ROOT_MODULE_ID,
  PREVENT_SPECIFIC_EVENTS_DURING_CD,
  WRAP_CD_IN_TRANSACTION,
} from './tokens';
import { NativeScriptDebug } from './trace';
import { ViewUtil } from './view-util';
import { getFirstNativeLikeView, NgView, TextNode } from './views';

const addStyleToCss = profile(
  '"renderer".addStyleToCss',
  function addStyleToCss(style: string, tag?: string | number): void {
    if (tag) {
      addTaggedAdditionalCSS(style, tag);
    } else {
      Application.addCss(style);
    }
  },
);

function runInRootZone<T>(fn: () => T): T {
  if (typeof Zone === 'undefined') {
    return fn();
  }
  return Zone.root.run(fn);
}

function inRootZone() {
  return function (target: unknown, key: string | symbol, descriptor: PropertyDescriptor) {
    const childFunction = descriptor.value;
    descriptor.value = function (...args: unknown[]) {
      const fn = childFunction.bind(this);
      return runInRootZone(() => fn(...args));
    };
    return descriptor;
  };
}

@Injectable({
  providedIn: 'root',
})
export class NativeScriptRendererHelperService {
  private _executingDomChanges = 0;
  get executingDomChanges() {
    return this._executingDomChanges;
  }
  get isExecutingDomChanges() {
    return this._executingDomChanges > 0;
  }
  beginDomChanges() {
    this._executingDomChanges++;
  }
  endDomChanges() {
    this._executingDomChanges--;
  }
  executeDomChange<T>(fn: () => T): T {
    try {
      this.beginDomChanges();
      return fn();
    } finally {
      this.endDomChanges();
    }
  }
}

function modifiesDom() {
  return function (
    target: {
      _rendererHelper: NativeScriptRendererHelperService;
    },
    key: string | symbol,
    descriptor: PropertyDescriptor,
  ) {
    const childFunction = descriptor.value;
    descriptor.value = function (...args: unknown[]) {
      const fn = childFunction.bind(this);
      return this._rendererHelper.executeDomChange(() => fn(...args));
    };
    return descriptor;
  };
}

export class NativeScriptRendererFactory implements RendererFactory2 {
  private componentRenderers = new Map<string, Renderer2>();
  // Signature of the styles last applied for each component `type.id`. Used to
  // detect a `styleUrls`/`styles` change across an `replaceMetadata` HMR
  // update so the cached renderer can re-apply the new (scoped) styles - the
  // renderer cache below otherwise short-circuits `addStyles`, so a component
  // style edit would never take effect without a full re-bootstrap.
  private componentStyleSignatures = new Map<string, string>();
  private defaultRenderer: Renderer2;
  // backwards compatibility with RadListView
  private rootView = inject(APP_ROOT_VIEW);
  private namespaceFilters = inject(NAMESPACE_FILTERS);
  private rootModuleID = inject(NATIVESCRIPT_ROOT_MODULE_ID);
  private reuseViews = inject(ENABLE_REUSABE_VIEWS, {
    optional: true,
  });
  private wrapCdInTransaction = __APPLE__ && inject(WRAP_CD_IN_TRANSACTION);
  private injector = inject(Injector);
  private cdDepth = 0;
  private viewUtil = new ViewUtil(this.namespaceFilters, this.reuseViews);

  constructor() {
    if (typeof this.reuseViews !== 'boolean') {
      this.reuseViews = false; // default to false
    }
    this.defaultRenderer = new NativeScriptRenderer(this.rootView);
  }
  createRenderer(hostElement: any, type: RendererType2): Renderer2 {
    if (NativeScriptDebug.enabled) {
      NativeScriptDebug.rendererLog(
        `NativeScriptRendererFactory.createRenderer ${hostElement}. type.id: ${type.id} type.encapsulation: ${type.encapsulation}`,
      );
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

      // HMR: a component `styleUrls`/`styles` edit recompiles the component
      // metadata and `replaceMetadata` recreates its views, which re-enters
      // `createRenderer` with the SAME `type.id` but NEW `type.styles`. The
      // cache hit above would otherwise return the renderer whose one-time
      // `addStyles` already ran with the OLD styles, so the change would never
      // render. When the style signature changed, re-apply: emulated styles
      // are re-scoped + re-added (same selector/specificity -> later wins);
      // None-encapsulation styles are re-added globally. Both keep the shared
      // `rootModuleID` tag so module teardown still removes them.
      const styleSignature = this.styleSignature(type.styles);
      if (this.componentStyleSignatures.get(type.id) !== styleSignature) {
        this.componentStyleSignatures.set(type.id, styleSignature);
        if (renderer instanceof EmulatedRenderer) {
          renderer.reapplyStyles(type.styles);
        } else {
          this.reapplyGlobalStyles(type.styles);
        }
      }

      return renderer;
    }

    if (type.encapsulation === ViewEncapsulation.None) {
      type.styles.map((s) => s.toString()).forEach((v) => addStyleToCss(v, this.rootModuleID));
      renderer = this.defaultRenderer;
    } else {
      runInInjectionContext(this.injector, () => {
        renderer = new EmulatedRenderer(type, hostElement);
      });
      (<EmulatedRenderer>renderer).applyToHost(hostElement);
    }

    this.componentRenderers.set(type.id, renderer);
    this.componentStyleSignatures.set(type.id, this.styleSignature(type.styles));
    return renderer;
  }

  // Stable signature of a component's styles, used to detect HMR style edits.
  private styleSignature(styles: (string | any[])[]): string {
    try {
      return (styles || []).map((s) => s.toString()).join("\n");
    } catch {
      return '';
    }
  }

  // Re-apply ViewEncapsulation.None component styles (global, unscoped) on an
  // HMR style edit and re-trigger styling on the live view tree.
  private reapplyGlobalStyles(styles: (string | any[])[]): void {
    try {
      styles.map((s) => s.toString()).forEach((v) => addStyleToCss(v, this.rootModuleID));
      Application.getRootView()?._onCssStateChange();
    } catch (err) {
      if (NativeScriptDebug.enabled) {
        NativeScriptDebug.rendererLog(`reapplyGlobalStyles failed: ${err}`);
      }
    }
  }
  begin() {
    if (__APPLE__ && this.wrapCdInTransaction) {
      if (this.cdDepth > 0) {
        // previous tick threw between begin and end; flush it
        while (this.cdDepth > 0) {
          CATransaction.commit();
          this.cdDepth--;
        }
      }
      CATransaction.begin();
      this.cdDepth++;
    }
  }
  end() {
    if (__APPLE__ && this.wrapCdInTransaction) {
      CATransaction.commit();
      this.cdDepth--;
    }
  }
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
  private namespaceFilters = inject(NAMESPACE_FILTERS);
  private reuseViews = inject(ENABLE_REUSABE_VIEWS, {
    optional: true,
  });
  private viewUtil = new ViewUtil(this.namespaceFilters, this.reuseViews);
  _rendererHelper = inject(NativeScriptRendererHelperService);
  private specificPreventedEvents = new Set(
    inject(PREVENT_SPECIFIC_EVENTS_DURING_CD, {
      optional: true,
    }) ?? [],
  );
  private preventChangeEvents =
    inject(PREVENT_SPECIFIC_EVENTS_DURING_CD, {
      optional: true,
    }) ?? false;

  constructor(private rootView: View) {}
  get data(): { [key: string]: any } {
    throw new Error('Method not implemented.');
  }
  destroy(): void {
    if (NativeScriptDebug.enabled) {
      NativeScriptDebug.rendererLog('NativeScriptRenderer.destroy');
    }
  }
  @inRootZone()
  @modifiesDom()
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
  @modifiesDom()
  createComment(value: string) {
    if (NativeScriptDebug.enabled) {
      NativeScriptDebug.rendererLog(`NativeScriptRenderer.createComment ${value}`);
    }
    return this.viewUtil.createComment(value);
  }
  @inRootZone()
  @modifiesDom()
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
  @modifiesDom()
  appendChild(parent: View, newChild: View): void {
    if (NativeScriptDebug.enabled) {
      NativeScriptDebug.rendererLog(`NativeScriptRenderer.appendChild child: ${newChild} parent: ${parent}`);
    }
    this.viewUtil.appendChild(parent, newChild);
  }
  @inRootZone()
  @modifiesDom()
  insertBefore(parent: any, newChild: any, refChild: any): void {
    if (NativeScriptDebug.enabled) {
      NativeScriptDebug.rendererLog(
        `NativeScriptRenderer.insertBefore child: ${newChild} ` + `parent: ${parent} refChild: ${refChild}`,
      );
    }
    this.viewUtil.insertBefore(parent, newChild, refChild);
  }
  @inRootZone()
  @modifiesDom()
  removeChild(parent: any, oldChild: any, isHostElement?: boolean): void {
    if (NativeScriptDebug.enabled) {
      NativeScriptDebug.rendererLog(
        `NativeScriptRenderer.removeChild child: ${oldChild} parent: ${parent} oldChild.parentNode: ${oldChild?.parentNode}`,
      );
    }
    this.viewUtil.removeChild(parent ?? oldChild.parentNode, oldChild);
  }
  selectRootElement(selectorOrNode: any, preserveContent?: boolean) {
    if (NativeScriptDebug.enabled) {
      NativeScriptDebug.rendererLog(`NativeScriptRenderer.selectRootElement: ${selectorOrNode}`);
    }
    // Angular 21+ reads `rootElement.tagName.toLowerCase()` after this call
    // (`locateHostElement`) to reject `<script>` hosts. Guarantee every return
    // path produces a View with a non-empty string `tagName`; otherwise the
    // bootstrap throws `Cannot read properties of undefined (reading 'toLowerCase')`.
    const ensureTagName = (view: any, fallback: string) => {
      if (view && typeof view.tagName !== 'string') {
        try {
          view.tagName = view.nodeName || fallback || 'view';
        } catch {}
      }
      return view;
    };
    if (selectorOrNode instanceof View) {
      return ensureTagName(selectorOrNode, '');
    }
    if (selectorOrNode && selectorOrNode[0] === '#') {
      const result = getViewById(this.rootView, selectorOrNode.slice(1));
      return ensureTagName((result || this.rootView) as View, selectorOrNode);
    }
    if (typeof selectorOrNode === 'string') {
      const view = this.viewUtil.createView(selectorOrNode);
      if (getFirstNativeLikeView(view) === view) {
        // view is nativelike!
        this.appendChild(this.rootView, view);
        return ensureTagName(view, selectorOrNode);
      }
    }
    return ensureTagName(this.rootView, '');
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
  @modifiesDom()
  setAttribute(el: any, name: string, value: string, namespace?: string): void {
    if (NativeScriptDebug.enabled) {
      NativeScriptDebug.rendererLog(
        `NativeScriptRenderer.setAttribute ${namespace ? namespace + ':' : ''}${el}.${name} = ${value}`,
      );
    }
    this.viewUtil.setProperty(el, name, value, namespace);
  }
  removeAttribute(el: any, name: string, namespace?: string): void {
    if (NativeScriptDebug.enabled) {
      NativeScriptDebug.rendererLog(
        `NativeScriptRenderer.removeAttribute ${namespace ? namespace + ':' : ''}${el}.${name}`,
      );
    }
  }
  @inRootZone()
  @modifiesDom()
  addClass(el: any, name: string): void {
    if (NativeScriptDebug.enabled) {
      NativeScriptDebug.rendererLog(`NativeScriptRenderer.addClass ${name}`);
    }
    this.viewUtil.addClass(el, name);
  }
  @inRootZone()
  @modifiesDom()
  removeClass(el: any, name: string): void {
    if (NativeScriptDebug.enabled) {
      NativeScriptDebug.rendererLog(`NativeScriptRenderer.removeClass ${name}`);
    }
    this.viewUtil.removeClass(el, name);
  }
  @inRootZone()
  @modifiesDom()
  setStyle(el: any, style: string, value: any, flags?: RendererStyleFlags2): void {
    if (NativeScriptDebug.enabled) {
      NativeScriptDebug.rendererLog(`NativeScriptRenderer.setStyle: ${el}, ${style} = ${value}`);
    }
    this.viewUtil.setStyle(el, style, value);
  }
  @inRootZone()
  @modifiesDom()
  removeStyle(el: any, style: string, flags?: RendererStyleFlags2): void {
    if (NativeScriptDebug.enabled) {
      NativeScriptDebug.rendererLog('NativeScriptRenderer.removeStyle: ${styleName}');
    }
    this.viewUtil.removeStyle(el, style);
  }
  @inRootZone()
  @modifiesDom()
  setProperty(el: any, name: string, value: any): void {
    if (NativeScriptDebug.enabled) {
      NativeScriptDebug.rendererLog(`NativeScriptRenderer.setProperty ${el}.${name} = ${value}`);
    }
    this.viewUtil.setProperty(el, name, value);
  }
  @inRootZone()
  @modifiesDom()
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
    let modifiedCallback = callback;
    if ((this.preventChangeEvents && eventName.endsWith('Change')) || this.specificPreventedEvents.has(eventName)) {
      modifiedCallback = (...args) => {
        if (this._rendererHelper.isExecutingDomChanges) {
          return;
        }
        return callback(...args);
      };
    }
    target.on(eventName, modifiedCallback);
    if (eventName === View.loadedEvent && target.isLoaded) {
      // we must create a new obervable here to ensure that the event goes through whatever zone patches are applied
      const obs = new Observable();
      obs.once(eventName, modifiedCallback);
      obs.notify({
        eventName,
        object: target,
      });
    }
    return () => target.off(eventName, modifiedCallback);
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

const addScopedStyleToCss = profile(
  `"renderer".addScopedStyleToCss`,
  function addScopedStyleToCss(style: string, tag?: number | string): void {
    if (tag) {
      addTaggedAdditionalCSS(style, tag);
    } else {
      Application.addCss(style);
    }
  },
);

@Injectable()
export class EmulatedRenderer extends NativeScriptRenderer {
  private contentAttr: string;
  private hostAttr: string;
  private componentId: string;
  private rootModuleId = inject(NATIVESCRIPT_ROOT_MODULE_ID);

  constructor(component: RendererType2, rootView: View) {
    super(rootView);

    const componentId = component.id.replace(ATTR_SANITIZER, '_');
    this.componentId = componentId;
    this.contentAttr = replaceNgAttribute(CONTENT_ATTR, componentId);
    this.hostAttr = replaceNgAttribute(HOST_ATTR, componentId);
    this.addStyles(component.styles, componentId);
  }

  /**
   * Re-apply this component's emulated-scoped styles after an HMR
   * `styleUrls`/`styles` edit. The renderer is cached per component type id
   * (see `NativeScriptRendererFactory.createRenderer`), so the constructor's
   * one-time `addStyles` never re-runs on `replaceMetadata` - without this
   * the new styles never reach the device. The freshly-compiled rules are
   * re-scoped to this renderer's component id (so the existing views, which
   * carry that `_ngcontent` attribute, match) and re-added under the same
   * `rootModuleId` tag; since they share the previous rules' selector and
   * specificity, the later-added values win. We then re-trigger styling on
   * the live view tree so the change paints without a re-bootstrap.
   */
  reapplyStyles(styles: (string | any[])[]): void {
    this.addStyles(styles, this.componentId);
    try {
      Application.getRootView()?._onCssStateChange();
    } catch {
      // best-effort restyle; never let an HMR style re-apply throw
    }
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
  @inRootZone()
  @modifiesDom()
  private addStyles(styles: (string | any[])[], componentId: string) {
    styles
      .map((s) => s.toString())
      .map((s) => replaceNgAttribute(s, componentId))
      .forEach((s) => addScopedStyleToCss(s, this.rootModuleId));
  }
}
