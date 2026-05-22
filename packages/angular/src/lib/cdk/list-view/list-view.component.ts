import {
  AfterContentInit,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  ContentChild,
  Directive,
  DoCheck,
  ElementRef,
  EmbeddedViewRef,
  EventEmitter,
  forwardRef,
  Host,
  HostListener,
  inject,
  Inject,
  InjectionToken,
  Input,
  IterableDiffer,
  IterableDiffers,
  NgZone,
  OnDestroy,
  Output,
  TemplateRef,
  ViewChild,
  ViewContainerRef,
} from '@angular/core';
import {
  CoreTypes,
  ItemEventData,
  KeyedTemplate,
  LayoutBase,
  ListView,
  ObservableArray,
  profile,
  SearchEventData,
  View,
} from '@nativescript/core';
import type { Template as NsTemplate } from '@nativescript/core';

import { extractSingleViewRecursive } from '../../element-registry/registry';
import { NativeScriptDebug } from '../../trace';
import { isListLikeIterable } from '../../utils/general';
import { NgViewTemplate } from '../../view-refs';
import { DetachedLoader } from '../detached-loader';

const NG_VIEW = '_ngViewRef';

export interface TemplatedItemsHost<T = any> {
  registerTemplate(key: string, template: TemplateRef<T>);
}

export const TEMPLATED_ITEMS_COMPONENT = new InjectionToken<TemplatedItemsHost>('TemplatedItemsComponent');

export class ItemContext<T> {
  constructor(
    public $implicit?: T,
    public item?: T,
    public index?: number,
    public even?: boolean,
    public odd?: boolean,
  ) {}
}

export class NsTemplatedItem<T> implements NgViewTemplate<{ index: number; data: T }> {
  constructor(
    private template: TemplateRef<ItemContext<T>>,
    public location: ViewContainerRef,
    private onCreate?: (view: View) => void,
  ) {}
  create(context?: { index: number; data: T }): View {
    const viewRef = this.location.createEmbeddedView(
      this.template,
      context ? this.setupItemContext(context) : new ItemContext(),
    );
    viewRef.detach(); // create detached, just beware this doesn't always work and the view might run the first CD anyway.
    const resultView = getItemViewRoot(viewRef);
    resultView[NG_VIEW] = viewRef;
    if (this.onCreate) {
      this.onCreate(resultView);
    }
    return resultView;
  }
  update(view: View, context?: { index: number; data: T }): void {
    const viewRef = this.getEmbeddedViewRef(view);
    this.setupItemContext(context, viewRef);
    viewRef?.detectChanges();
  }
  attach(view: View): void {
    const viewRef = this.getEmbeddedViewRef(view);
    viewRef?.reattach();
    viewRef?.detectChanges();
  }
  detach(view: View): void {
    const viewRef = this.getEmbeddedViewRef(view);
    viewRef?.detach();
  }
  dispose(view: View): void {
    const viewRef = this.getEmbeddedViewRef(view);
    viewRef?.destroy();
  }

  getEmbeddedViewRef(view: View): EmbeddedViewRef<ItemContext<T>> | undefined {
    let viewRef = view[NG_VIEW];

    // Getting angular view from original element (in cases when ProxyViewContainer
    // is used NativeScript internally wraps it in a StackLayout)
    if (!viewRef && view instanceof LayoutBase && view.getChildrenCount() > 0) {
      viewRef = view.getChildAt(0)[NG_VIEW];
    }
    return viewRef;
  }

  isValid(view: View) {
    return !!this.getEmbeddedViewRef(view);
  }

  private setupItemContext(
    { index, data }: { index: number; data: T },
    oldView?: EmbeddedViewRef<ItemContext<T>>,
  ): ItemContext<T> {
    const context: ItemContext<T> = oldView ? oldView.context : new ItemContext<T>();
    context.$implicit = data;
    context.item = data;
    context.index = index;
    context.even = index % 2 === 0;
    context.odd = !context.even;
    return context;
  }
}

export interface SetupItemViewArgs<T> {
  view: EmbeddedViewRef<ItemContext<T>>;
  nativeElement: View;
  data: T;
  index: number;
  context: ItemContext<T>;
}

@Component({
  // eslint-disable-next-line @angular-eslint/component-selector
  selector: 'ListView',
  template: `<DetachedContainer>
    <ng-container #loader></ng-container>
  </DetachedContainer>`,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DetachedLoader],
  providers: [{ provide: TEMPLATED_ITEMS_COMPONENT, useExisting: forwardRef(() => ListViewComponent) }],
})
export class ListViewComponent<T = any> implements DoCheck, OnDestroy, AfterContentInit, TemplatedItemsHost {
  public get nativeElement(): ListView {
    return this.templatedItemsView;
  }

  private readonly _iterableDiffers: IterableDiffers = inject(IterableDiffers);
  private readonly _changeDetectorRef: ChangeDetectorRef = inject(ChangeDetectorRef);
  private readonly _elementRef: ElementRef = inject(ElementRef);

  // I believe this only exists so this can be inherited and people can override it.
  protected templatedItemsView: ListView = this._elementRef.nativeElement;
  protected _items: T[] | ObservableArray<T>;
  protected _differ: IterableDiffer<T>;
  protected _templateMap: Map<string, NsTemplatedItem<T>>;
  protected _viewToTemplate: WeakMap<View, string> = new WeakMap<View, string>();

  @ViewChild('loader', { read: ViewContainerRef, static: true }) loader: ViewContainerRef;

  @Output() public setupItemView = new EventEmitter<SetupItemViewArgs<T>>();

  @ContentChild(TemplateRef, { read: TemplateRef, static: false }) itemTemplateQuery: TemplateRef<ItemContext<T>>;

  // Sticky header template driven by Angular. Users can provide either:
  // 1) A string/Template bound to the ListView `[stickyHeaderTemplate]` input
  //    (mirrors the XML attribute usage), or
  // 2) An Angular `<ng-template #nsStickyHeaderTemplate>` whose root becomes
  //    the header view when using the external renderer.
  @ContentChild('nsStickyHeaderTemplate', { read: TemplateRef, static: false })
  stickyHeaderTemplateRef: TemplateRef<ItemContext<any>>;

  fallbackItemTemplate: TemplateRef<ItemContext<T>>;

  /**
   * Sticky header template as supported by core ListView (string or NsTemplate).
   * This allows direct string templates just like XML usage:
   * `<ListView stickyHeaderTemplate="<GridLayout>...</GridLayout>">`.
   */
  @Input()
  get stickyHeaderTemplate(): string | NsTemplate {
    return this.templatedItemsView?.stickyHeaderTemplate as any;
  }
  set stickyHeaderTemplate(value: string | NsTemplate) {
    if (this.templatedItemsView) {
      // If Angular template reference is also provided, that takes precedence
      // and will be wired in ngAfterContentInit via stickyHeaderTemplateRef.
      this.templatedItemsView.stickyHeaderTemplate = value as any;
    }
  }

  @Input()
  get stickyHeader(): boolean {
    return this.templatedItemsView?.stickyHeader;
  }
  set stickyHeader(value: boolean) {
    if (this.templatedItemsView) {
      this.templatedItemsView.stickyHeader = value;
    }
  }

  @Input()
  get stickyHeaderHeight(): CoreTypes.LengthType {
    return this.templatedItemsView?.stickyHeaderHeight;
  }
  set stickyHeaderHeight(value: number) {
    if (this.templatedItemsView) {
      this.templatedItemsView.stickyHeaderHeight = value;
    }
  }

  @Input()
  get stickyHeaderTopPadding(): any {
    return this.templatedItemsView?.stickyHeaderTopPadding as any;
  }
  set stickyHeaderTopPadding(value: any) {
    if (this.templatedItemsView) {
      this.templatedItemsView.stickyHeaderTopPadding = value;
    }
  }

  @Input()
  get sectioned(): boolean {
    return this.templatedItemsView?.sectioned;
  }
  set sectioned(value: boolean) {
    if (this.templatedItemsView) {
      this.templatedItemsView.sectioned = value;
    }
  }

  @Input()
  get showSearch(): boolean {
    return this.templatedItemsView?.showSearch;
  }
  set showSearch(value: boolean) {
    if (this.templatedItemsView) {
      this.templatedItemsView.showSearch = value;
    }
  }

  @Input()
  get searchAutoHide(): boolean {
    return this.templatedItemsView?.searchAutoHide;
  }
  set searchAutoHide(value: boolean) {
    if (this.templatedItemsView) {
      this.templatedItemsView.searchAutoHide = value;
    }
  }

  @Input()
  get items() {
    return this._items;
  }

  set items(value: T[] | ObservableArray<T>) {
    this._items = value;
    let needDiffer = true;
    if (value instanceof ObservableArray) {
      needDiffer = false;
    }
    if (needDiffer && !this._differ && isListLikeIterable(value)) {
      this._differ = this._iterableDiffers.find(this._items).create((_index, item) => {
        return item;
      });
    }

    this.templatedItemsView.items = this._items;
  }

  /**
   * @deprecated
   */
  constructor(_elementRef: ElementRef);
  /**
   * @deprecated
   */
  constructor(_elementRef: ElementRef, _iterableDiffers: IterableDiffers, _changeDetectorRef: ChangeDetectorRef);
  /**
   * @deprecated
   */
  constructor(_elementRef: ElementRef, _iterableDiffers: IterableDiffers, _ngZone: NgZone);
  constructor();
  // this elementRef is only here for backwards compatibility reasons
  constructor(_elementRef?: ElementRef) {
    if (_elementRef) {
      this.templatedItemsView = _elementRef.nativeElement;
    }
  }

  ngAfterContentInit() {
    if (NativeScriptDebug.isLogEnabled()) {
      NativeScriptDebug.listViewLog('TemplatedItemsView.ngAfterContentInit()');
    }

    this.setItemTemplates();

    // If an Angular sticky header template is provided, convert it into a
    // core `Template` function. Core will call this to create header views
    // and then assign bindingContext for each section.
    if (this.stickyHeaderTemplateRef && this.templatedItemsView) {
      const angularHeaderTemplate: NsTemplate = () => {
        const viewRef = this.loader.createEmbeddedView(this.stickyHeaderTemplateRef as TemplateRef<ItemContext<any>>);
        const root = getItemViewRoot(viewRef as EmbeddedViewRef<unknown>);
        (root as any)[NG_VIEW] = viewRef;
        return root;
      };

      this.templatedItemsView.stickyHeaderTemplate = angularHeaderTemplate;
    }
  }

  ngOnDestroy() {
    this.templatedItemsView = null;

    if (this._templateMap) {
      this._templateMap.clear();
    }
  }

  private setItemTemplates() {
    // The itemTemplateQuery may be changed after list items are added that contain <template> inside,
    // so cache and use only the original template to avoid errors.
    this.fallbackItemTemplate = this.itemTemplateQuery;
    if (this.fallbackItemTemplate && !this._templateMap?.has('default')) {
      // apparently you can create a Core ListView without a template...
      // we also add a fallback default for when the user sets multiple templates but no templateSelector
      this.registerTemplate('default', this.fallbackItemTemplate);
    }

    if (this._templateMap) {
      // sometimes templates are registered before loader is ready, so we update here
      this._templateMap.forEach((t) => (t.location = this.loader));
      if (NativeScriptDebug.isLogEnabled()) {
        NativeScriptDebug.listViewLog('Setting templates');
      }

      const templates: KeyedTemplate[] = [];
      this._templateMap.forEach((value, key) => {
        templates.push({
          createView: () => null, // we'll handle creation later, otherwise core will create an invalid template
          key,
        });
      });
      this.templatedItemsView.itemTemplates = templates;
    }
  }

  public registerTemplate(key: string, template: TemplateRef<ItemContext<T>>) {
    if (NativeScriptDebug.isLogEnabled()) {
      NativeScriptDebug.listViewLog(`registerTemplate for key: ${key}, ${this.loader}`);
    }

    if (!this._templateMap) {
      this._templateMap = new Map<string, NsTemplatedItem<T>>();
    }

    this._templateMap.set(key, new NsTemplatedItem<T>(template, this.loader, (v) => this._viewToTemplate.set(v, key)));
  }

  @HostListener('itemLoading', ['$event'])
  @profile
  public onItemLoading(args: ItemEventData) {
    if (!this._templateMap) {
      return;
    }
    const index = args.index;
    const lview: ListView = args.object as ListView;
    const items = lview.items as any;

    const isSectioned = lview.sectioned;
    let currentItem: any;
    let absoluteIndex = index;

    if (isSectioned) {
      const sectionIndex = this.resolveSectionIndex(args, args.view as View);
      const rowIndex = this.resolveRowIndex(args, args.view as View);

      if (sectionIndex === undefined || rowIndex === undefined) {
        return;
      }

      currentItem = this.getSectionItem(lview, sectionIndex, rowIndex);
      if (currentItem === undefined || currentItem === null) {
        return;
      }

      absoluteIndex = this.computeAbsoluteIndex(lview, sectionIndex, rowIndex);
    } else {
      currentItem = this.getFlatItem(items, index);
      if (currentItem === undefined || currentItem === null) {
        return;
      }
    }

    let template: NsTemplatedItem<T>;

    if (args.view) {
      if (NativeScriptDebug.isLogEnabled()) {
        NativeScriptDebug.listViewLog(`onItemLoading: ${index} - Reusing existing view`);
      }

      let templateKey = this._viewToTemplate.get(args.view as View);
      if (!templateKey && args.view instanceof LayoutBase && args.view.getChildrenCount() > 0) {
        templateKey = this._viewToTemplate.get(args.view.getChildAt(0));
      }
      if (!templateKey) {
        if (NativeScriptDebug.isLogEnabled()) {
          NativeScriptDebug.listViewError(`ViewReference not found for item ${index}. View recycling is not working`);
        }
        return;
      }
      template = this._templateMap.get(templateKey);
      template.update(args.view as View, { index: absoluteIndex, data: currentItem });
    } else {
      const templateKey =
        typeof lview.itemTemplateSelector === 'function'
          ? (lview.itemTemplateSelector as any)(currentItem, absoluteIndex, items)
          : 'default';
      template = this._templateMap.get(templateKey);
      if (!template) {
        if (NativeScriptDebug.isLogEnabled()) {
          NativeScriptDebug.listViewError(`Template for key '${templateKey}' not found.`);
        }
        return;
      }
      args.view = template.create({ index: absoluteIndex, data: currentItem });
    }

    const viewRef = template.getEmbeddedViewRef(args.view as View);
    if (viewRef) {
      this.setupViewRef(viewRef, currentItem, absoluteIndex, args.view as View);
      template.attach(args.view as View);
    }

    this._changeDetectorRef.detectChanges();
  }

  private resolveSectionIndex(args: ItemEventData, nativeView?: View): number | undefined {
    const eventSection = Number.isInteger((args as any).section) ? (args as any).section : undefined;
    if (eventSection !== undefined) {
      return eventSection;
    }
    const viewSection =
      nativeView && Number.isInteger((nativeView as any)._listViewSectionIndex)
        ? (nativeView as any)._listViewSectionIndex
        : undefined;
    if (viewSection !== undefined) {
      return viewSection;
    }
    return undefined;
  }

  private resolveRowIndex(args: ItemEventData, nativeView?: View): number | undefined {
    if (Number.isInteger(args.index)) {
      return args.index;
    }
    const viewRow =
      nativeView && Number.isInteger((nativeView as any)._listViewItemIndex)
        ? (nativeView as any)._listViewItemIndex
        : undefined;
    return viewRow;
  }

  private getSectionItem(listView: ListView, sectionIndex: number, rowIndex: number): any {
    if (sectionIndex < 0 || rowIndex < 0) {
      return undefined;
    }
    const sectionItems = (listView as any)._getItemsInSection?.(sectionIndex);
    if (!sectionItems) {
      return undefined;
    }
    if (typeof sectionItems.getItem === 'function') {
      return sectionItems.getItem(rowIndex);
    }
    return sectionItems[rowIndex];
  }

  private computeAbsoluteIndex(listView: ListView, sectionIndex: number, rowIndex: number): number {
    let absoluteIndex = rowIndex;
    for (let i = 0; i < sectionIndex; i++) {
      const sectionItems = (listView as any)._getItemsInSection?.(i);
      absoluteIndex += this.getCollectionLength(sectionItems);
    }
    return absoluteIndex;
  }

  private getCollectionLength(collection: any): number {
    if (!collection) {
      return 0;
    }
    if (typeof collection.length === 'number') {
      return collection.length;
    }
    if (typeof collection.getCount === 'function') {
      return collection.getCount();
    }
    return 0;
  }

  private getFlatItem(items: any, index: number): any {
    if (!items) {
      return undefined;
    }
    if (typeof items.getItem === 'function') {
      return items.getItem(index);
    }
    return Array.isArray(items) ? items[index] : undefined;
  }

  public setupViewRef(viewRef: EmbeddedViewRef<ItemContext<T>>, data: T, index: number, nativeElement: View): void {
    const context = viewRef.context;
    this.setupItemView.next({ view: viewRef, nativeElement, data: data, index: index, context: context });
  }

  ngDoCheck() {
    if (this._differ) {
      if (NativeScriptDebug.isLogEnabled()) {
        NativeScriptDebug.listViewLog('ngDoCheck() - execute differ');
      }

      const changes = this._differ.diff(this._items as T[]);
      if (changes) {
        if (NativeScriptDebug.isLogEnabled()) {
          NativeScriptDebug.listViewLog('ngDoCheck() - refresh');
        }

        this.templatedItemsView.refresh();
      }
    }
  }
}

export type RootLocator = (nodes: Array<unknown>, nestLevel: number) => View;

export function getItemViewRoot(
  viewRef: EmbeddedViewRef<unknown>,
  rootLocator: RootLocator = extractSingleViewRecursive,
): View {
  const rootView = rootLocator(viewRef.rootNodes, 0);
  return rootView;
}

// eslint-disable-next-line @angular-eslint/directive-selector
@Directive({
  selector: '[nsTemplateKey],[nsTemplateKeys]',
  standalone: true,
})
export class TemplateKeyDirective<T> {
  constructor(
    private templateRef: TemplateRef<T>,
    @Host() @Inject(TEMPLATED_ITEMS_COMPONENT) private comp: TemplatedItemsHost<T>,
  ) {}

  @Input()
  set nsTemplateKey(value: string) {
    if (this.comp && this.templateRef) {
      this.comp.registerTemplate(value, this.templateRef);
    }
  }
  @Input()
  set nsTemplateKeys(values: string[]) {
    // single template with multiple keys
    if (this.comp && this.templateRef && values) {
      values.forEach((value) => this.comp.registerTemplate(value, this.templateRef));
    }
  }
}
