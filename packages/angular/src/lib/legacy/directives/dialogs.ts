import { ApplicationRef, ComponentFactoryResolver, ComponentRef, Injectable, Injector, NgModuleRef, NgZone, Renderer2, Type, ViewContainerRef, ɵmarkDirty } from '@angular/core';
import { Frame, View, ViewBase, ProxyViewContainer, ShowModalOptions, ContentView } from '@nativescript/core';

import { NSLocationStrategy } from '../router/ns-location-strategy';
import { AppHostView, AppHostAsyncView } from '../../app-host-view';
import { once } from '../../utils';
import { DetachedLoader } from '../../utils/detached-loader';
import { ComponentPortal, Portal, PortalOutlet, NativescriptDomPortalOutlet } from '../../utils/portal';
import { ViewUtil, isContentView, getFirstNativeLikeView } from '../../view-util';

export type BaseShowModalOptions = Pick<ShowModalOptions, Exclude<keyof ShowModalOptions, 'closeCallback' | 'context'>>;

export interface ModalDialogOptions extends BaseShowModalOptions {
  context?: any;
  viewContainerRef?: ViewContainerRef;
  moduleRef?: NgModuleRef<any>;
  target?: View;
}

export interface ShowDialogOptions extends BaseShowModalOptions {
  containerRef: ViewContainerRef;
  /**
   * which container to attach the change detection
   * if not specified, attaches to the ApplicationRef (recommended)
   */
  attachToContainerRef?: ViewContainerRef;
  context: any;
  doneCallback;
  pageFactory?: any;
  parentView: ViewBase;
  resolver: ComponentFactoryResolver;
  type: Type<any>;
}

export class ModalDialogParams {
  constructor(public context: any = {}, public closeCallback: (...args) => any) {}
}

@Injectable()
export class ModalDialogService {
  constructor(private location: NSLocationStrategy, private zone: NgZone, private appRef: ApplicationRef, private viewUtil: ViewUtil) {}

  public showModal(type: Type<any>, options: ModalDialogOptions): Promise<any> {
    if (!options.viewContainerRef) {
      throw new Error('No viewContainerRef: ' + 'Make sure you pass viewContainerRef in ModalDialogOptions.');
    }

    let parentView = options.viewContainerRef.element.nativeElement;
    if (options.target) {
      parentView = options.target;
    }

    if ((parentView instanceof AppHostView || parentView instanceof AppHostAsyncView) && parentView.ngAppRoot) {
      parentView = parentView.ngAppRoot;
    }

    // _ngDialogRoot is the first child of the previously detached proxy.
    // It should have 'viewController' (iOS) or '_dialogFragment' (Android) available for
    // presenting future modal views.
    if (parentView._ngDialogRoot) {
      parentView = parentView._ngDialogRoot;
    }

    // resolve from particular module (moduleRef)
    // or from same module as parentView (viewContainerRef)
    const componentContainer = options.moduleRef || options.viewContainerRef;
    const resolver = componentContainer.injector.get(ComponentFactoryResolver);

    let frame = parentView;
    if (!(parentView instanceof Frame)) {
      frame = (parentView.page && parentView.page.frame) || Frame.topmost();
    }

    this.location._beginModalNavigation(frame);

    return new Promise((resolve, reject) => {
      setTimeout(() => {
        try {
          this._showDialog({
            ...options,
            containerRef: options.viewContainerRef,
            context: options.context,
            doneCallback: resolve,
            parentView,
            resolver,
            type,
          });
        } catch (err) {
          reject(err);
        }
      }, 10);
    });
  }

  private _showDialog(options: ShowDialogOptions): void {
    let componentView: View;
    let detachedLoaderRef: ComponentRef<DetachedLoader>;
    let portalOutlet: NativescriptDomPortalOutlet;

    const closeCallback = once((...args) => {
      options.doneCallback.apply(undefined, args);
      if (componentView) {
        componentView.closeModal();
        this.location._closeModalNavigation();
        if (detachedLoaderRef || portalOutlet) {
          this.zone.run(() => {
            portalOutlet?.dispose();
            detachedLoaderRef?.instance.detectChanges();
            detachedLoaderRef?.destroy();
          });
        }
      }
    });

    const modalParams = new ModalDialogParams(options.context, closeCallback);

    const childInjector = Injector.create({
      providers: [{ provide: ModalDialogParams, useValue: modalParams }],
      parent: options.containerRef.injector,
    });
    this.zone.run(() => {
      // if we ever support templates in the old API
      // if(options.templateRef) {
      //     const detachedFactory = options.resolver.resolveComponentFactory(DetachedLoader);
      //     if(options.attachToContainerRef) {
      //         detachedLoaderRef = options.attachToContainerRef.createComponent(detachedFactory, 0, childInjector, null);
      //     } else {
      //         detachedLoaderRef = detachedFactory.create(childInjector); // this DetachedLoader is **completely** detached
      //         this.appRef.attachView(detachedLoaderRef.hostView); // we attach it to the applicationRef, so it becomes a "root" view in angular's hierarchy
      //     }
      //     detachedLoaderRef.changeDetectorRef.detectChanges(); // force a change detection
      //     detachedLoaderRef.instance.createTemplatePortal(options.templateRef);
      // }
      const targetView = new ContentView();
      const portal = new ComponentPortal(options.type);
      portalOutlet = new NativescriptDomPortalOutlet(targetView, options.resolver, this.appRef, childInjector, this.viewUtil);
      const componentRef = portalOutlet.attach(portal);
      ɵmarkDirty(componentRef.instance);
      componentView = getFirstNativeLikeView(targetView);
      if (componentView !== componentRef.location.nativeElement) {
        componentRef.location.nativeElement._ngDialogRoot = componentView;
      }
      if (componentView.parent) {
        this.viewUtil.removeChild(componentView.parent as View, componentView);
      }
      options.parentView.showModal(componentView, { ...options, closeCallback });
      // detachedLoaderRef.instance.loadComponent(options.type).then((compRef) => {
      // 	const detachedProxy = <ProxyViewContainer>compRef.location.nativeElement;

      // 	if (detachedProxy.getChildrenCount() > 1) {
      // 		throw new Error('Modal content has more than one root view.');
      // 	}
      // 	componentView = detachedProxy.getChildAt(0);

      // 	if (componentView.parent) {
      // 		(<any>componentView.parent)._ngDialogRoot = componentView;
      // 		(<any>componentView.parent).removeChild(componentView);
      // 	}

      // 	options.parentView.showModal(componentView, { ...options, closeCallback });
      // });
    });
  }
}