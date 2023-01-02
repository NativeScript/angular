import { FormattedString, Frame, Page, Span, TextBase } from '@nativescript/core';
import { isInvisibleNode } from '../views/utils';
import { NgView, ViewClassMeta } from '../views/view-types';

export const frameMeta: ViewClassMeta = {
  insertChild: (parent: Frame, child: NgView) => {
    // Page cannot be added to Frame with _addChildFromBuilder (thwos "use defaultPage" error)
    if (isInvisibleNode(child)) {
      return;
    } else if (child instanceof Page) {
      parent.navigate({ create: () => child });
    } else {
      throw new Error('Only a Page can be a child of Frame');
    }
  },
};

export const formattedStringMeta: ViewClassMeta = {
  insertChild(parent: FormattedString, child: Span, next: Span) {
    const index = parent.spans.indexOf(next);
    if (index > -1) {
      parent.spans.splice(index, 0, child);
    } else {
      parent.spans.push(child);
    }
  },
  removeChild(parent: FormattedString, child: Span) {
    const index = parent.spans.indexOf(child);
    if (index > -1) {
      parent.spans.splice(index, 1);
    }
  },
};

export const textBaseMeta: ViewClassMeta = {
  insertChild(parent: TextBase, child, next) {
    if (child instanceof FormattedString) {
      parent.formattedText = child;
    } else if (child instanceof Span) {
      parent.formattedText ??= new FormattedString();
      formattedStringMeta.insertChild(parent.formattedText, child, next);
    }
  },
  removeChild(parent: TextBase, child: NgView) {
    if (!parent.formattedText) return;
    if (child instanceof FormattedString) {
      if (parent.formattedText === child) {
        parent.formattedText = null;
      }
    } else if (child instanceof Span) {
      formattedStringMeta.removeChild(parent.formattedText, child);
    }
  },
};
