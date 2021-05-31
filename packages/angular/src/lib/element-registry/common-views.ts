import { AbsoluteLayout, ActivityIndicator, Button, ContentView, DatePicker, DockLayout, FlexboxLayout, FormattedString, Frame, GridLayout, HtmlView, Image, Label, ListPicker, ListView, Page, Placeholder, Progress, ProxyViewContainer, Repeater, RootLayout, ScrollView, SearchBar, SegmentedBar, SegmentedBarItem, Slider, Span, StackLayout, Switch, TabView, TextField, TextView, TimePicker, WebView, WrapLayout } from '@nativescript/core';
import { frameMeta } from './metas';
import { registerElement } from './registry';

// Register default NativeScript components
// Note: ActionBar related components are registerd together with action-bar directives.
export function registerNativeScriptViewComponents() {
  if (!(<any>global).__ngRegisteredViews) {
    (<any>global).__ngRegisteredViews = true;
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
  }
}
