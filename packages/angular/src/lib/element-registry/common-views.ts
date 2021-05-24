import { View, LayoutBase, Page, Frame, AbsoluteLayout, ActivityIndicator, Button, ContentView, DatePicker, DockLayout, GridLayout, HtmlView, Image, Label, ListPicker, ListView, Placeholder, Progress, ProxyViewContainer, Repeater, ScrollView, SearchBar, SegmentedBar, SegmentedBarItem, Slider, StackLayout, FlexboxLayout, Switch, TabView, TextField, TextView, TimePicker, WebView, WrapLayout, FormattedString, Span, RootLayout } from '@nativescript/core';
import { isInvisibleNode, NgView, registerElement, ViewClassMeta } from './element-registry';

const frameMeta: ViewClassMeta = {
  insertChild: (parent: Frame, child: NgView, next: any) => {
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

// Register default NativeScript components
// Note: ActionBar related components are registerd together with action-bar directives.
registerElement('AbsoluteLayout', () => AbsoluteLayout);
registerElement('ActivityIndicator', () => ActivityIndicator);
registerElement('Button', () => Button);
registerElement('ContentView', () => ContentView);
registerElement('DatePicker', () => DatePicker);
registerElement('DockLayout', () => DockLayout);
registerElement('Frame', () => <any>Frame, frameMeta);
registerElement('GridLayout', () => GridLayout);
registerElement('HtmlView', () => HtmlView);
registerElement('Image', () => Image);
// Parse5 changes <Image> tags to <img>. WTF!
registerElement('img', () => Image);
registerElement('Label', () => Label);
registerElement('ListPicker', () => ListPicker);
registerElement('ListView', () => ListView);
registerElement('Page', () => Page);
registerElement('Placeholder', () => Placeholder);
registerElement('Progress', () => Progress);
registerElement('ProxyViewContainer', () => ProxyViewContainer);
registerElement('Repeater', () => Repeater);
registerElement('RootLayout', () => RootLayout);
registerElement('ScrollView', () => ScrollView);
registerElement('SearchBar', () => SearchBar);
registerElement('SegmentedBar', () => SegmentedBar);
registerElement('SegmentedBarItem', () => <any>SegmentedBarItem);
registerElement('Slider', () => Slider);
registerElement('StackLayout', () => StackLayout);
registerElement('FlexboxLayout', () => FlexboxLayout);
registerElement('Switch', () => Switch);
registerElement('TabView', () => TabView);
registerElement('TextField', () => TextField);
registerElement('TextView', () => TextView);
registerElement('TimePicker', () => TimePicker);
registerElement('WebView', () => WebView);
registerElement('WrapLayout', () => WrapLayout);
registerElement('FormattedString', () => <any>FormattedString);
registerElement('Span', () => <any>Span);

registerElement('DetachedContainer', () => ProxyViewContainer, {
  skipAddToDom: true,
});

registerElement('page-router-outlet', () => <any>Frame);
