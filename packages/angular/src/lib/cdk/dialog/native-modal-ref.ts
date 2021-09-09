import { ApplicationRef, ComponentFactoryResolver, ComponentRef, EmbeddedViewRef, Injector, Optional, ViewContainerRef, ɵmarkDirty } from '@angular/core';
import { ContentView, View, Application, Frame } from '@nativescript/core';
import { fromEvent, Subject } from 'rxjs';
import { take } from 'rxjs/operators';
import { AppHostAsyncView, AppHostView } from '../../app-host-view';
import { NSLocationStrategy } from '../../legacy/router/ns-location-strategy';
import { once } from '../../utils/general';
import { DetachedLoader } from '../detached-loader';
import { ComponentPortal, TemplatePortal } from '../portal/common';
import { NativeScriptDomPortalOutlet } from '../portal/nsdom-portal-outlet';
import { NativeDialogConfig } from './dialog-config';
import { NgViewRef } from '../../view-refs';

export class NativeModalRef {
  _id: string;
  stateChanged = new Subject<{ state: 'opened' | 'closed' | 'closing' }>();
  onDismiss = new Subject<void>();

  parentView: View;
  portalOutlet: NativeScriptDomPortalOutlet;
  detachedLoaderRef: ComponentRef<DetachedLoader>;
  modalViewRef: NgViewRef<any>;

  private _closeCallback: () => void;

  constructor(private _config: NativeDialogConfig, private _injector: Injector, @Optional() private location?: NSLocationStrategy) {
    let parentView = this._config.viewContainerRef?.element.nativeElement || Application.getRootView();

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

    this._closeCallback = once(() => {
      this.stateChanged.next({ state: 'closing' });
      this.modalViewRef.firstNativeLikeView?.closeModal();
      this.location?._closeModalNavigation();
      // this.detachedLoaderRef?.destroy();
      if (this.modalViewRef?.firstNativeLikeView.isLoaded) {
        fromEvent(this.modalViewRef.firstNativeLikeView, 'unloaded')
          .pipe(take(1))
          .subscribe(() => this.stateChanged.next({ state: 'closed' }));
      } else {
        this.stateChanged.next({ state: 'closed' });
      }
    });
  }

  _generateDetachedContainer(vcRef?: ViewContainerRef) {
    const detachedFactory = (this._config.componentFactoryResolver || this._injector.get(ComponentFactoryResolver)).resolveComponentFactory(DetachedLoader);
    if (vcRef) {
      this.detachedLoaderRef = vcRef.createComponent(detachedFactory);
    } else {
      this.detachedLoaderRef = detachedFactory.create(this._config.viewContainerRef?.injector || this._injector);
      this._injector.get(ApplicationRef).attachView(this.detachedLoaderRef.hostView);
    }
    this.detachedLoaderRef.changeDetectorRef.detectChanges();
  }

  attachTemplatePortal<T>(portal: TemplatePortal<T>): EmbeddedViewRef<T> {
    this.startModalNavigation();
    const vcRef = portal.viewContainerRef || this._config.viewContainerRef;
    this._generateDetachedContainer(vcRef);
    portal.viewContainerRef = this.detachedLoaderRef.instance.vc;
    const targetView = new ContentView();
    this.portalOutlet = new NativeScriptDomPortalOutlet(targetView, this._config.componentFactoryResolver || this._injector.get(ComponentFactoryResolver), this._injector.get(ApplicationRef), this._injector);
    const templateRef = this.portalOutlet.attach(portal);
    this.modalViewRef = new NgViewRef(templateRef);
    this.modalViewRef.firstNativeLikeView['__ng_modal_id__'] = this._id;
    // if we don't detach the view from its parent, ios gets mad
    this.modalViewRef.detachNativeLikeView();

    const userOptions = this._config.nativeOptions || {};
    this.parentView.showModal(this.modalViewRef.firstNativeLikeView, {
      context: null,
      ...userOptions,
      closeCallback: () => {
        this.location?._closeModalNavigation();
        this.onDismiss.next();
        this.onDismiss.complete();
      },
      cancelable: !this._config.disableClose,
    });
    //   if (this.modalView !== templateRef.rootNodes[0]) {
    //     componentRef.location.nativeElement._ngDialogRoot = this.modalView;
    //   }
    return templateRef;
  }

  attachComponentPortal<T>(portal: ComponentPortal<T>): ComponentRef<T> {
    this.startModalNavigation();

    const targetView = new ContentView();
    this.portalOutlet = new NativeScriptDomPortalOutlet(targetView, this._config.componentFactoryResolver || this._injector.get(ComponentFactoryResolver), this._injector.get(ApplicationRef), this._injector);
    const componentRef = this.portalOutlet.attach(portal);
    ɵmarkDirty(componentRef.instance);
    this.modalViewRef = new NgViewRef(componentRef);
    if (this.modalViewRef.firstNativeLikeView !== this.modalViewRef.view) {
      (<any>this.modalViewRef.view)._ngDialogRoot = this.modalViewRef.firstNativeLikeView;
    }
    this.modalViewRef.firstNativeLikeView['__ng_modal_id__'] = this._id;
    // if we don't detach the view from its parent, ios gets mad
    this.modalViewRef.detachNativeLikeView();

    const userOptions = this._config.nativeOptions || {};
    this.parentView.showModal(this.modalViewRef.firstNativeLikeView, {
      context: null,
      ...userOptions,
      closeCallback: () => {
        this.location?._closeModalNavigation();
        this.onDismiss.next();
        this.onDismiss.complete();
      },
      cancelable: !this._config.disableClose,
    });
    return componentRef;
  }

  _startExitAnimation() {
    this._closeCallback();
  }

  dispose() {
    this.portalOutlet.dispose();
  }
  private startModalNavigation() {
    const frame = this.parentView instanceof Frame ? this.parentView : this.parentView?.page?.frame || Frame.topmost();

    this.location?._beginModalNavigation(frame);
  }
}
