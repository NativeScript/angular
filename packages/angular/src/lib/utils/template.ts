import { ComponentRef, EmbeddedViewRef } from '@angular/core';
import { View } from '@nativescript/core';
import { getFirstNativeLikeView } from '../view-util';

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
  view: View;
  ref: EmbeddedViewRef<T> | ComponentRef<T>;
  firstNativeLikeView: View;

  constructor(ref: EmbeddedViewRef<T> | ComponentRef<T>) {
    this.ref = ref;
    this.view = ref instanceof EmbeddedViewRef ? ref.rootNodes[0] : ref.location.nativeElement;
    this.firstNativeLikeView = getFirstNativeLikeView(this.view);
  }
}