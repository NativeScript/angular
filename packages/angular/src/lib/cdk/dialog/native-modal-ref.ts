import { ApplicationRef, ComponentFactoryResolver, ComponentRef, EmbeddedViewRef, Injector, Optional, ViewContainerRef, ɵmarkDirty } from '@angular/core';
import { ContentView, View } from '@nativescript/core';
import { getRootView } from '@nativescript/core/application';
import { fromEvent, Subject } from 'rxjs';
import { take } from 'rxjs/operators';
import { AppHostAsyncView, AppHostView } from '../../app-host-view';
import { InvisibleNode } from '../../views';
import { NSLocationStrategy } from '../../legacy/router';
import { once } from '../../utils';
import { getFirstNativeLikeView } from '../../view-util';
import { DetachedLoader } from '../detached-loader';
import { ComponentPortal, NativescriptDomPortalOutlet, TemplatePortal } from '../portal';
import { MatDialogConfig } from './dialog-config';

export class NativeModalRef {
  _id: string;
  stateChanged = new Subject<{ state: 'opened' | 'closed' | 'closing' }>();
  onDismiss = new Subject();

  parentView: View;
  portalOutlet: NativescriptDomPortalOutlet;
  dettachedLoaderRef: ComponentRef<DetachedLoader>;
  modalView: View;

  private _closeCallback: () => void;

  constructor(private _config: MatDialogConfig, private _injector: Injector, @Optional() private location?: NSLocationStrategy) {
    let parentView = this._config.viewContainerRef?.element.nativeElement || getRootView();

    if ((parentView instanceof AppHostView || parentView instanceof AppHostAsyncView) && parentView.ngAppRoot) {
      parentView = parentView.ngAppRoot;
    }

    // _ngDialogRoot is the first child of the previously detached proxy.
    // It should have 'viewController' (iOS) or '_dialogFragment' (Android) available for
    // presenting future modal views.
    if (parentView._ngDialogRoot) {
      parentView = parentView._ngDialogRoot;
    }
    this.parentView = parentView;
  }

  _generateDetachedContainer(vcRef?: ViewContainerRef) {
    const detachedFactory = (this._config.componentFactoryResolver || this._injector.get(ComponentFactoryResolver)).resolveComponentFactory(DetachedLoader);
    if (vcRef) {
      this.dettachedLoaderRef = vcRef.createComponent(detachedFactory);
    } else {
      this.dettachedLoaderRef = detachedFactory.create(this._config.viewContainerRef?.injector || this._injector);
      this._injector.get(ApplicationRef).attachView(this.dettachedLoaderRef.hostView);
    }
    this.dettachedLoaderRef.changeDetectorRef.detectChanges();
  }

  attachTemplatePortal<T>(portal: TemplatePortal<T>): EmbeddedViewRef<T> {
    const vcRef = portal.viewContainerRef || this._config.viewContainerRef;
    this._generateDetachedContainer(vcRef);
    portal.viewContainerRef = this.dettachedLoaderRef.instance.vc;
    const targetView = new ContentView();
    this.portalOutlet = new NativescriptDomPortalOutlet(targetView, this._config.componentFactoryResolver || this._injector.get(ComponentFactoryResolver), this._injector.get(ApplicationRef), this._injector);
    const templateRef = this.portalOutlet.attach(portal);
    this.modalView = getFirstNativeLikeView(templateRef.rootNodes.find((view) => !(view instanceof InvisibleNode)));
    this.parentView.showModal(this.modalView, {
      closeCallback: () => {
        this.onDismiss.next();
        this.onDismiss.complete();
      },
      context: null,
    });
    //   if (this.modalView !== templateRef.rootNodes[0]) {
    //     componentRef.location.nativeElement._ngDialogRoot = this.modalView;
    //   }
    return templateRef;
  }

  attachComponentPortal<T>(portal: ComponentPortal<T>): ComponentRef<T> {
    this._closeCallback = once(() => {
      this.stateChanged.next({ state: 'closing' });
      if (this.modalView) {
        this.modalView.closeModal();
        this.location?._closeModalNavigation();
        // if (detachedLoaderRef || portalOutlet) {
        //   this.zone.run(() => {
        //     portalOutlet?.dispose();
        //     detachedLoaderRef?.instance.detectChanges();
        //     detachedLoaderRef?.destroy();
        //   });
        // }
      }
      if (this.modalView.isLoaded) {
        fromEvent(this.modalView, 'unloaded')
          .pipe(take(1))
          .subscribe(() => this.stateChanged.next({ state: 'closed' }));
      } else {
        this.stateChanged.next({ state: 'closed' });
      }
    });

    const targetView = new ContentView();
    this.portalOutlet = new NativescriptDomPortalOutlet(targetView, this._config.componentFactoryResolver || this._injector.get(ComponentFactoryResolver), this._injector.get(ApplicationRef), this._injector);
    const componentRef = this.portalOutlet.attach(portal);
    ɵmarkDirty(componentRef.instance);
    this.modalView = getFirstNativeLikeView(targetView);
    if (this.modalView !== componentRef.location.nativeElement) {
      componentRef.location.nativeElement._ngDialogRoot = this.modalView;
    }
    // apparently this isn't needed
    // if (componentView.parent) {
    //   this.viewUtil.removeChild(componentView.parent as View, componentView);
    // }
    this.parentView.showModal(this.modalView, {
      closeCallback: () => {
        this.onDismiss.next();
        this.onDismiss.complete();
      },
      context: null,
    });
    return componentRef;
  }

  _startExitAnimation() {
    this._closeCallback();
  }

  dispose() {
    this.portalOutlet.dispose();
  }
}
