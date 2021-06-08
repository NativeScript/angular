import { ComponentRef, EmbeddedViewRef } from '@angular/core';
import { View } from '@nativescript/core';
import { detachViewFromParent, getFirstNativeLikeView, InvisibleNode } from './views';

export interface NgViewRef<T> {
  view: View;
  ref: EmbeddedViewRef<T> | ComponentRef<T>;
  firstNativeLikeView: View;
}

export interface NgViewTemplate<T> {
  create(context?: T): View;
  update(view: View, context?: T): void;
  attach(view: View): void;
  detach(view: View): void;
  dispose(view: View): void;
}

export class NgViewRef<T> implements NgViewRef<T> {
  /**
   * Component's view instance or first valid template view
   */
  view: View;
  ref: EmbeddedViewRef<T> | ComponentRef<T>;
  /**
   * First valid view that isn't strictly logical (ContentView, ProxyViewContainer, ...)
   * This view *very* likely has a nativeView associated to it.
   */
  firstNativeLikeView: View;

  constructor(ref: EmbeddedViewRef<T> | ComponentRef<T>) {
    this.ref = ref;
    this.view = ref instanceof ComponentRef ? ref.location.nativeElement : ref.rootNodes.find((v) => !(v instanceof InvisibleNode));
    this.firstNativeLikeView = getFirstNativeLikeView(this.view);
  }

  detachNativeLikeView() {
    detachViewFromParent(this.firstNativeLikeView);
  }
}
