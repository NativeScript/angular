import { LayoutBase, GridLayout, Frame, View } from '@nativescript/core';

const TESTING_ROOT_ID = '__testing_container';

/**
 * Get a reference to the fixtures container.
 */
export function testingRootView(): LayoutBase {
  const rootPageLayout = Frame.topmost().currentPage.content as LayoutBase;

  let testingRoot: LayoutBase;
  rootPageLayout.eachChild((child: View) => {
    if (child.id === TESTING_ROOT_ID) {
      testingRoot = child as LayoutBase;
      // rootPageLayout.removeChild(child);
      return false;
    }
    return true;
  });

  if (!testingRoot) {
    testingRoot = new GridLayout();
    testingRoot.id = TESTING_ROOT_ID;
    GridLayout.setColumnSpan(testingRoot, 100);
    GridLayout.setRowSpan(testingRoot, 100);
    rootPageLayout.addChild(testingRoot);
  }

  return testingRoot;
}
