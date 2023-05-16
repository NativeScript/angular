import { View } from '@nativescript/core';
import { NgView } from './view-types';

const getClassName = (instance) => instance.constructor.name;

export abstract class InvisibleNode extends View implements NgView {
  meta: { skipAddToDom: boolean };
  nodeType: number;
  nodeName: string;
  // @ts-ignore
  parentNode: NgView;
  nextSibling: NgView;
  previousSibling: NgView;
  firstChild: NgView;
  lastChild: NgView;
  ngCssClasses: Map<string, boolean>;

  constructor(protected name: string = '') {
    super();

    this.nodeType = 1;
    this.nodeName = getClassName(this);
  }

  toString() {
    return `${this.nodeName}(${this.id})-${this.name}`;
  }
}

export class CommentNode extends InvisibleNode {
  protected static id = 0;

  constructor(value?: string) {
    super(value);

    this.meta = {
      skipAddToDom: true,
    };
    this.id = CommentNode.id.toString();
    CommentNode.id += 1;
  }
}

export class TextNode extends InvisibleNode {
  public static textChangeEvent = 'textChange';
  protected static id = 0;
  protected _text = '';
  get text() {
    return this._text;
  }
  set text(t: string) {
    this._text = t;
    this.notify({ eventName: TextNode.textChangeEvent, object: this, value: t });
  }
  callbackMap = new Map<unknown, Array<(evt: any) => void>>();

  constructor(value?: string) {
    super(value);
    this._text = value;

    this.meta = {
      skipAddToDom: true,
    };
    this.id = TextNode.id.toString();
    TextNode.id += 1;
  }

  registerTextChange(callback: (text: string) => void, id: unknown) {
    const cb = (evt) => callback(evt.value);
    const cbArr = this.callbackMap.get(id) || [];
    cbArr.push(cb);
    this.callbackMap.set(id, cbArr);
    this.on('textChange', cb);
  }

  unregisterTextChange(id: unknown) {
    const cbArr = this.callbackMap.get(id) || [];
    cbArr.forEach((cb) => this.off('textChange', cb));
    this.callbackMap.delete(id);
  }
}
