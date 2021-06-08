import { ApplicationRef, ComponentFactoryResolver, ComponentRef, EmbeddedViewRef, Injector, TemplateRef, Type, ViewContainerRef } from '@angular/core';
import { ContentView } from '@nativescript/core';
import { DetachedLoader } from './cdk/detached-loader';
import { ComponentPortal, NativeScriptDomPortalOutlet, TemplatePortal } from './cdk/portal';
import { NgViewRef } from './view-refs';

/**
 * creates a DetachedLoader either linked to the ViewContainerRef or the ApplicationRef if ViewContainerRef is not defined
 * @param resolver component factory resolver
 * @param injector default injector, unused if viewContainerRef is set
 * @param viewContainerRef where the view should live in the angular tree
 * @returns reference to the DetachedLoader
 */
export function generateDetachedLoader(resolver: ComponentFactoryResolver, injector: Injector, viewContainerRef?: ViewContainerRef) {
  injector = viewContainerRef?.injector || injector;
  const detachedFactory = resolver.resolveComponentFactory(DetachedLoader);
  const detachedLoaderRef = viewContainerRef?.createComponent(detachedFactory) || detachedFactory.create(injector);
  if (!viewContainerRef) {
    injector.get(ApplicationRef).attachView(detachedLoaderRef.hostView);
  }
  detachedLoaderRef.changeDetectorRef.detectChanges();
  return detachedLoaderRef;
}

/**
 * Generates a NgViewRef from a component or template. @see NgViewRef
 * Pass keepNativeViewAttached as `true` if you don't want the first native view to be detached from its parent.
 * For opening modals and others, the firstNativeLikeView should be detached.
 * @param typeOrTemplate ComponentType or TemplateRef that should be instanced
 * @param options options for creating the view
 * @returns NgViewRef
 */
export function generateNativeScriptView<T>(
  typeOrTemplate: Type<T> | TemplateRef<T>,
  options: {
    resolver?: ComponentFactoryResolver;
    viewContainerRef?: ViewContainerRef;
    injector: Injector;
    keepNativeViewAttached?: boolean;
    /**
     * reuse a detachedLoaderRef. This will override viewContainerRef
     */
    detachedLoaderRef?: ComponentRef<DetachedLoader>;
  }
) {
  let detachedLoaderRef: ComponentRef<DetachedLoader> = options.detachedLoaderRef;
  const reusingDetachedLoader = !!detachedLoaderRef;
  if (reusingDetachedLoader) {
    options.viewContainerRef = detachedLoaderRef.instance.vc;
  }
  const injector = options.viewContainerRef?.injector || options.injector;
  const resolver = options.resolver || injector.get(ComponentFactoryResolver);
  if (!detachedLoaderRef && (options.viewContainerRef || typeOrTemplate instanceof TemplateRef)) {
    detachedLoaderRef = generateDetachedLoader(resolver, injector, options.viewContainerRef);
  }
  let portal: ComponentPortal<T> | TemplatePortal<T>;
  if (typeOrTemplate instanceof TemplateRef) {
    portal = new TemplatePortal(typeOrTemplate, detachedLoaderRef.instance.vc);
  } else {
    portal = new ComponentPortal(typeOrTemplate, detachedLoaderRef?.instance.vc);
  }
  const parentView = new ContentView();
  const portalOutlet = new NativeScriptDomPortalOutlet(parentView, resolver, injector.get(ApplicationRef), injector);
  const componentOrTemplateRef: ComponentRef<T> | EmbeddedViewRef<T> = portalOutlet.attach(portal);
  componentOrTemplateRef.onDestroy(() => {
    portalOutlet.dispose();
  });
  if (detachedLoaderRef && !reusingDetachedLoader) {
    componentOrTemplateRef.onDestroy(() => {
      detachedLoaderRef.destroy();
    });
  }
  const viewRef = new NgViewRef(componentOrTemplateRef);
  (viewRef as any).detachedLoaderRef = detachedLoaderRef;
  if (!options.keepNativeViewAttached) {
    viewRef.detachNativeLikeView();
  }
  return viewRef;
}
