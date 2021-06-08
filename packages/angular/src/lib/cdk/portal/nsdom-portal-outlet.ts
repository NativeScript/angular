/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import { ComponentFactoryResolver, ComponentRef, EmbeddedViewRef, ApplicationRef, Injector, Renderer2, Optional } from '@angular/core';
import { View } from '@nativescript/core';
import { CommentNode } from '../../views/invisible-nodes';
import { ViewUtil } from '../../view-util';
import { BasePortalOutlet, ComponentPortal, TemplatePortal, DomPortal } from './common';

/**
 * A PortalOutlet for attaching portals to an arbitrary DOM element outside of the Angular
 * application context.
 */
export class NativeScriptDomPortalOutlet extends BasePortalOutlet {
  private _viewUtil: ViewUtil;
  constructor(
    /** Element into which the content is projected. */
    public outletElement: View,
    private _componentFactoryResolver: ComponentFactoryResolver,
    private _appRef: ApplicationRef,
    private _defaultInjector: Injector,
    @Optional() viewUtil?: ViewUtil
  ) {
    super();
    this._viewUtil = viewUtil || this._defaultInjector.get(ViewUtil);
  }

  /**
   * Attach the given ComponentPortal to DOM element using the ComponentFactoryResolver.
   * @param portal Portal to be attached
   * @returns Reference to the created component.
   */
  attachComponentPortal<T>(portal: ComponentPortal<T>): ComponentRef<T> {
    const resolver = portal.componentFactoryResolver || this._componentFactoryResolver;
    const componentFactory = resolver.resolveComponentFactory(portal.component);
    let componentRef: ComponentRef<T>;

    // If the portal specifies a ViewContainerRef, we will use that as the attachment point
    // for the component (in terms of Angular's component tree, not rendering).
    // When the ViewContainerRef is missing, we use the factory to create the component directly
    // and then manually attach the view to the application.
    if (portal.viewContainerRef) {
      componentRef = portal.viewContainerRef.createComponent(componentFactory, portal.viewContainerRef.length, portal.injector || portal.viewContainerRef.injector);

      this.setDisposeFn(() => componentRef.destroy());
    } else {
      componentRef = componentFactory.create(portal.injector || this._defaultInjector);
      this._appRef.attachView(componentRef.hostView);
      this.setDisposeFn(() => {
        this._appRef.detachView(componentRef.hostView);
        componentRef.destroy();
      });
    }
    // At this point the component has been instantiated, so we move it to the location in the DOM
    // where we want it to be rendered.
    const rootNode = this._getComponentRootNode(componentRef);
    if (rootNode.parent) {
      this._viewUtil.removeChild(rootNode.parent as View, rootNode);
    }
    this._viewUtil.appendChild(this.outletElement, this._getComponentRootNode(componentRef));

    return componentRef;
  }

  /**
   * Attaches a template portal to the DOM as an embedded view.
   * @param portal Portal to be attached.
   * @returns Reference to the created embedded view.
   */
  attachTemplatePortal<C>(portal: TemplatePortal<C>): EmbeddedViewRef<C> {
    let viewContainer = portal.viewContainerRef;
    let viewRef = viewContainer.createEmbeddedView(portal.templateRef, portal.context);

    // The method `createEmbeddedView` will add the view as a child of the viewContainer.
    // But for the DomPortalOutlet the view can be added everywhere in the DOM
    // (e.g Overlay Container) To move the view to the specified host element. We just
    // re-append the existing root nodes.
    viewRef.rootNodes.forEach((rootNode) => {
      if (rootNode.parent) {
        this._viewUtil.removeChild(rootNode.parent as View, rootNode);
      }
      this._viewUtil.appendChild(this.outletElement, rootNode);
    });

    // Note that we want to detect changes after the nodes have been moved so that
    // any directives inside the portal that are looking at the DOM inside a lifecycle
    // hook won't be invoked too early.
    viewRef.detectChanges();

    this.setDisposeFn(() => {
      let index = viewContainer.indexOf(viewRef);
      if (index !== -1) {
        viewContainer.remove(index);
      }
    });

    // TODO(jelbourn): Return locals from view.
    return viewRef;
  }

  /**
   * Attaches a DOM portal by transferring its content into the outlet.
   * @param portal Portal to be attached.
   * @deprecated To be turned into a method.
   * @breaking-change 10.0.0
   */
  attachDomPortal = (portal: DomPortal) => {
    const element = portal.element;
    if (!element.parentNode && (typeof ngDevMode === 'undefined' || ngDevMode)) {
      throw Error('DOM portal content must be attached to a parent node.');
    }

    // Anchor used to save the element's previous position so
    // that we can restore it when the portal is detached.
    const anchorNode: CommentNode = this._viewUtil.createComment('dom-portal');

    this._viewUtil.insertBefore(element.parentNode as View, anchorNode, element);
    this._viewUtil.appendChild(this.outletElement, element);

    super.setDisposeFn(() => {
      // We can't use `replaceWith` here because IE doesn't support it.
      if (anchorNode.parentNode) {
        this._viewUtil.insertBefore(anchorNode.parentNode, element, anchorNode);
        this._viewUtil.removeChild(anchorNode.parentNode, anchorNode);
        //anchorNode.parentNode.replaceChild(element, anchorNode);
      }
    });
  };

  /**
   * Clears out a portal from the DOM.
   */
  dispose(): void {
    super.dispose();
    if (this.outletElement.parentNode != null) {
      this._viewUtil.removeChild(this.outletElement.parentNode as View, this.outletElement);
    }
  }

  /** Gets the root HTMLElement for an instantiated component. */
  private _getComponentRootNode(componentRef: ComponentRef<any>): View {
    return (componentRef.hostView as EmbeddedViewRef<any>).rootNodes[0] as View;
  }
}
