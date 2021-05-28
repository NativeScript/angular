import { AbsoluteLayout, ActivityIndicator, Button, ContentView, DatePicker, DockLayout, FlexboxLayout, FormattedString, Frame, GridLayout, HtmlView, Image, Label, ListPicker, ListView, Page, Placeholder, Progress, ProxyViewContainer, Repeater, RootLayout, ScrollView, SearchBar, SegmentedBar, SegmentedBarItem, Slider, Span, StackLayout, Switch, TabView, TextField, TextView, TimePicker, WebView, WrapLayout } from '@nativescript/core';
import { isInvisibleNode, registerElement } from './element-registry';
import { NgView, ViewClassMeta } from './view-types';

const frameMeta: ViewClassMeta = {
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

// Register default NativeScript components
// Note: ActionBar related components are registerd together with action-bar directives.
registerElement('AbsoluteLayout', () => AbsoluteLayout);
registerElement('ActivityIndicator', () => ActivityIndicator);
registerElement('Button', () => Button);
registerElement('ContentView', () => ContentView);
registerElement('DatePicker', () => DatePicker);
registerElement('DockLayout', () => DockLayout);
registerElement('Frame', () => Frame, frameMeta);
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
registerElement('SegmentedBarItem', () => SegmentedBarItem);
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
registerElement('FormattedString', () => FormattedString);
registerElement('Span', () => Span);

registerElement('DetachedContainer', () => ProxyViewContainer, {
  skipAddToDom: true,
});

registerElement('page-router-outlet', () => Frame);
