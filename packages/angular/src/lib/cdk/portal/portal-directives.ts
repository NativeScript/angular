/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import { ComponentFactoryResolver, ComponentRef, Directive, EmbeddedViewRef, EventEmitter, NgModule, OnDestroy, OnInit, Output, Renderer2, TemplateRef, ViewContainerRef } from '@angular/core';
import { View } from '@nativescript/core';
import { CommentNode } from '../../views/invisible-nodes';
import { BasePortalOutlet, ComponentPortal, DomPortal, Portal, TemplatePortal } from './common';

/**
 * Directive version of a `TemplatePortal`. Because the directive *is* a TemplatePortal,
 * the directive instance itself can be attached to a host, enabling declarative use of portals.
 */
@Directive({
  selector: '[cdkPortal]',
  exportAs: 'cdkPortal',
})
export class CdkPortal extends TemplatePortal {
  constructor(templateRef: TemplateRef<any>, viewContainerRef: ViewContainerRef) {
    super(templateRef, viewContainerRef);
  }
}

/**
 * Possible attached references to the CdkPortalOutlet.
 */
export type CdkPortalOutletAttachedRef = ComponentRef<any> | EmbeddedViewRef<any> | null;

/**
 * Directive version of a PortalOutlet. Because the directive *is* a PortalOutlet, portals can be
 * directly attached to it, enabling declarative use.
 *
 * Usage:
 * `<ng-template [cdkPortalOutlet]="greeting"></ng-template>`
 */
@Directive({
  selector: '[cdkPortalOutlet]',
  exportAs: 'cdkPortalOutlet',
  // eslint-disable-next-line @angular-eslint/no-inputs-metadata-property
  inputs: ['portal: cdkPortalOutlet'],
})
export class CdkPortalOutlet extends BasePortalOutlet implements OnInit, OnDestroy {
  /** Whether the portal component is initialized. */
  private _isInitialized = false;

  /** Reference to the currently-attached component/view ref. */
  private _attachedRef: CdkPortalOutletAttachedRef;

  constructor(private _componentFactoryResolver: ComponentFactoryResolver, private _viewContainerRef: ViewContainerRef, private renderer: Renderer2) {
    super();
  }

  /** Portal associated with the Portal outlet. */
  get portal(): Portal<any> | null {
    return this._attachedPortal;
  }

  set portal(portal: Portal<any> | null) {
    // Ignore the cases where the `portal` is set to a falsy value before the lifecycle hooks have
    // run. This handles the cases where the user might do something like `<div cdkPortalOutlet>`
    // and attach a portal programmatically in the parent component. When Angular does the first CD
    // round, it will fire the setter with empty string, causing the user's content to be cleared.
    if (this.hasAttached() && !portal && !this._isInitialized) {
      return;
    }

    if (this.hasAttached()) {
      super.detach();
    }

    if (portal) {
      super.attach(portal);
    }

    this._attachedPortal = portal;
  }

  /** Emits when a portal is attached to the outlet. */
  @Output() attached: EventEmitter<CdkPortalOutletAttachedRef> = new EventEmitter<CdkPortalOutletAttachedRef>();

  /** Component or view reference that is attached to the portal. */
  get attachedRef(): CdkPortalOutletAttachedRef {
    return this._attachedRef;
  }

  ngOnInit() {
    this._isInitialized = true;
  }

  ngOnDestroy() {
    super.dispose();
    this._attachedPortal = null;
    this._attachedRef = null;
  }

  /**
   * Attach the given ComponentPortal to this PortalOutlet using the ComponentFactoryResolver.
   *
   * @param portal Portal to be attached to the portal outlet.
   * @returns Reference to the created component.
   */
  attachComponentPortal<T>(portal: ComponentPortal<T>): ComponentRef<T> {
    portal.setAttachedHost(this);

    // If the portal specifies an origin, use that as the logical location of the component
    // in the application tree. Otherwise use the location of this PortalOutlet.
    const viewContainerRef = portal.viewContainerRef != null ? portal.viewContainerRef : this._viewContainerRef;

    const resolver = portal.componentFactoryResolver || this._componentFactoryResolver;
    const componentFactory = resolver.resolveComponentFactory<T>(portal.component);
    const ref = viewContainerRef.createComponent<T>(componentFactory, viewContainerRef.length, portal.injector || viewContainerRef.injector);

    // If we're using a view container that's different from the injected one (e.g. when the portal
    // specifies its own) we need to move the component into the outlet, otherwise it'll be rendered
    // inside of the alternate view container.
    if (viewContainerRef !== this._viewContainerRef) {
      this.renderer.appendChild(this._getRootNode(), (ref.hostView as EmbeddedViewRef<any>).rootNodes[0]);
    }

    super.setDisposeFn(() => ref.destroy());
    this._attachedPortal = portal;
    this._attachedRef = ref;
    this.attached.emit(ref);

    return ref;
  }

  /**
   * Attach the given TemplatePortal to this PortalHost as an embedded View.
   * @param portal Portal to be attached.
   * @returns Reference to the created embedded view.
   */
  attachTemplatePortal<C>(portal: TemplatePortal<C>): EmbeddedViewRef<C> {
    portal.setAttachedHost(this);
    const viewRef = this._viewContainerRef.createEmbeddedView(portal.templateRef, portal.context);
    super.setDisposeFn(() => this._viewContainerRef.clear());

    this._attachedPortal = portal;
    this._attachedRef = viewRef;
    this.attached.emit(viewRef);

    return viewRef;
  }

  /**
   * Attaches the given DomPortal to this PortalHost by moving all of the portal content into it.
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
    const anchorNode: CommentNode = this.renderer.createComment('dom-portal');

    portal.setAttachedHost(this);
    this.renderer.insertBefore(element.parentNode, anchorNode, element);
    this.renderer.appendChild(this._getRootNode(), element);

    super.setDisposeFn(() => {
      if (anchorNode.parentNode) {
        this.renderer.insertBefore(anchorNode.parentNode, element, anchorNode);
        this.renderer.removeChild(anchorNode.parentNode, anchorNode);
        // anchorNode.parentNode!.replaceChild(element, anchorNode);
      }
    });
  };

  /** Gets the root node of the portal outlet. */
  private _getRootNode(): View {
    const nativeElement: View = this._viewContainerRef.element.nativeElement;

    // The directive could be set on a template which will result in a comment
    // node being the root. Use the comment's parent node if that is the case.
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    return (!(nativeElement instanceof CommentNode) ? nativeElement : nativeElement.parentNode!) as View;
  }

  // eslint-disable-next-line @typescript-eslint/member-ordering
  static ngAcceptInputType_portal: Portal<any> | null | undefined | '';
}

@NgModule({
  exports: [CdkPortal, CdkPortalOutlet],
  declarations: [CdkPortal, CdkPortalOutlet],
})
export class PortalModule {}
