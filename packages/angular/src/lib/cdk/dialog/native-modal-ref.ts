import {
  ApplicationRef,
  ComponentFactoryResolver,
  ComponentRef,
  createComponent,
  EmbeddedViewRef,
  Injector,
  Optional,
  ViewContainerRef,
} from '@angular/core';
import { Application, ContentView, Frame, View } from '@nativescript/core';
import { fromEvent, Subject } from 'rxjs';
import { take } from 'rxjs/operators';
import { AppHostAsyncView, AppHostView } from '../../app-host-view';
import { NSLocationStrategy } from '../../legacy/router/ns-location-strategy';
import { once } from '../../utils/general';
import { NgViewRef } from '../../view-refs';
import { DetachedLoader } from '../detached-loader';
import { ComponentPortal, TemplatePortal } from '../portal/common';
import { NativeScriptDomPortalOutlet } from '../portal/nsdom-portal-outlet';
import { NativeDialogConfig } from './dialog-config';

export class NativeModalRef {
  _id: string;
  stateChanged = new Subject<{ state: 'opened' | 'closed' | 'closing' }>();
  onDismiss = new Subject<void>();

  parentView: View;
  portalOutlet: NativeScriptDomPortalOutlet;
  detachedLoaderRef: ComponentRef<DetachedLoader>;
  modalViewRef: NgViewRef<any>;

  private _closeCallback: () => void;
  private _isDismissed = false;

  constructor(
    private _config: NativeDialogConfig,
    private _injector: Injector,
    @Optional() private location?: NSLocationStrategy,
  ) {
    const nativeElement =
      this._config.renderIn === 'root'
        ? Application.getRootView()
        : this._config.renderIn === 'viewContainerRef'
          ? this._config.viewContainerRef?.element.nativeElement
          : this._config.renderIn;
    let parentView = nativeElement || Application.getRootView();

    if ((parentView instanceof AppHostView || parentView instanceof AppHostAsyncView) && parentView.ngAppRoot) {
      parentView = parentView.ngAppRoot;
    }

    // _ngDialogRoot is the first child of the previously detached proxy.
    // It should have 'viewController' (iOS) or '_dialogFragment' (Android) available for
    // presenting future modal views.
    while (parentView._modal || parentView._ngDialogRoot) {
      parentView = parentView._modal || parentView._ngDialogRoot;
    }
    this.parentView = parentView;

    this._closeCallback = once(async () => {
      this.stateChanged.next({ state: 'closing' });
      if (!this._isDismissed) {
        this.modalViewRef.firstNativeLikeView?.closeModal();
      }
      await this.location?._closeModalNavigation();
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
    if (vcRef) {
      this.detachedLoaderRef = vcRef.createComponent(DetachedLoader);
    } else {
      this.detachedLoaderRef = createComponent(DetachedLoader, {
        environmentInjector: this._injector.get(ApplicationRef).injector,
        elementInjector: this._config.viewContainerRef?.injector || this._injector,
      });
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
    this.portalOutlet = new NativeScriptDomPortalOutlet(
      targetView,
      this._config.componentFactoryResolver || this._injector.get(ComponentFactoryResolver),
      this._injector.get(ApplicationRef),
      this._injector,
    );
    const templateRef = this.portalOutlet.attach(portal);
    this.modalViewRef = new NgViewRef(templateRef);
    this.modalViewRef.firstNativeLikeView['__ng_modal_id__'] = this._id;
    // if we don't detach the view from its parent, ios gets mad
    this.modalViewRef.detachNativeLikeView();

    const userOptions = this._config.nativeOptions || {};
    this.parentView.showModal(this.modalViewRef.firstNativeLikeView, {
      context: null,
      ...userOptions,
      closeCallback: async () => {
        await this.location?._closeModalNavigation();
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
    this.portalOutlet = new NativeScriptDomPortalOutlet(
      targetView,
      this._config.componentFactoryResolver || this._injector.get(ComponentFactoryResolver),
      this._injector.get(ApplicationRef),
      this._injector,
    );
    const componentRef = this.portalOutlet.attach(portal);
    componentRef.changeDetectorRef.detectChanges();
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
      closeCallback: async () => {
        this._isDismissed = true;
        this._closeCallback(); // close callback can only be called once, so we call it here to setup the exit events
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
