import { Frame, Page } from '@nativescript/core';
import { NgView, ViewClassMeta } from '../views/view-types';
import { isInvisibleNode } from '../views/utils';

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
