import { View } from '@nativescript/core';
import { NgView } from './view-types';

const getClassName = (instance) => instance.constructor.name;

export abstract class InvisibleNode extends View implements NgView {
  meta: { skipAddToDom: boolean };
  nodeType: number;
  nodeName: string;
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
  protected static id = 0;

  constructor(value?: string) {
    super(value);

    this.meta = {
      skipAddToDom: true,
    };
    this.id = TextNode.id.toString();
    TextNode.id += 1;
  }
}
