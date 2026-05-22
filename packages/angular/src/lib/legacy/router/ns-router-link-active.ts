import { AfterContentInit, ChangeDetectorRef, ContentChildren, Directive, ElementRef, EventEmitter, inject, Input, OnChanges, OnDestroy, Output, QueryList, Renderer2, SimpleChanges, untracked } from '@angular/core';
import { from, of, Subscription } from 'rxjs';
import { mergeAll } from 'rxjs/operators';

import { IsActiveMatchOptions, NavigationEnd, Router, isActive } from '@angular/router';

import { NSRouterLink } from './ns-router-link';

// Inline equivalent of upstream's exactMatchOptions
const exactMatchOptions: IsActiveMatchOptions = {
  paths: 'exact',
  fragment: 'ignored',
  matrixParams: 'ignored',
  queryParams: 'exact',
};

// Inline equivalent of upstream's subsetMatchOptions
const subsetMatchOptions: IsActiveMatchOptions = {
  paths: 'subset',
  fragment: 'ignored',
  matrixParams: 'ignored',
  queryParams: 'subset',
};

/**
 * Use instead of `'paths' in options` to be compatible with property renaming
 */
function isActiveMatchOptions(options: { exact: boolean } | Partial<IsActiveMatchOptions>): options is Partial<IsActiveMatchOptions> {
  const o = options as Partial<IsActiveMatchOptions>;
  return !!(o.paths || o.matrixParams || o.queryParams || o.fragment);
}

/**
 * The NSRouterLinkActive directive lets you add a CSS class to an element when the link's route
 * becomes active.
 *
 * Consider the following example:
 *
 * ```
 * <Label [nsRouterLink]="/user/bob" [nsRouterLinkActive]="'active-link'" text="Bob"></Label>
 * ```
 *
 * When the url is either "/user" or "/user/bob", the active-link class will
 * be added to the component. If the url changes, the class will be removed.
 *
 * You can set more than one class, as follows:
 *
 * ```
 * <Label [nsRouterLink]="/user/bob" [nsRouterLinkActive]="'class1 class2'" text="Bob"></Label>
 * <Label [nsRouterLink]="/user/bob" [nsRouterLinkActive]="['class1', 'class2']" text="Bob"></Label>
 * ```
 *
 * You can configure NSRouterLinkActive by passing `exact: true`. This will add the
 * classes only when the url matches the link exactly.
 *
 * ```
 * <Label [nsRouterLink]="/user/bob" [nsRouterLinkActive]="'active-link'"
 * [nsRouterLinkActiveOptions]="{exact: true}" text="Bob"></Label>
 * ```
 *
 * To directly check the `isActive` status of the link, assign the `NSRouterLinkActive`
 * instance to a template variable.
 * For example, the following checks the status without assigning any CSS classes:
 *
 * ```
 * <Label [nsRouterLink]="/user/bob" nsRouterLinkActive #rla="routerLinkActive"
 *   [text]="'Bob ' + (rla.isActive ? '(already open)' : '')"></Label>
 * ```
 *
 * You can apply the NSRouterLinkActive directive to an ancestor of a RouterLink.
 *
 * ```
 * <StackLayout [nsRouterLinkActive]="'active-link'" [nsRouterLinkActiveOptions]="{exact: true}">
 *   <Label [nsRouterLink]="/user/jim" text="Jim"></Label>
 *   <Label [nsRouterLink]="/user/bob" text="Bob"></Label>
 * </StackLayout>
 * ```
 *
 * This will set the active-link class on the StackLayout if the url is either "/user/jim" or
 * "/user/bob".
 *
 * The `NSRouterLinkActive` directive can also be used to set the aria-current attribute
 * to provide an alternative distinction for active elements to visually impaired users.
 *
 * For example, the following code adds the 'active' class to the Home Page link when it is
 * indeed active and in such case also sets its aria-current attribute to 'page':
 *
 * ```
 * <Label nsRouterLink="/" [nsRouterLinkActive]="'active'" ariaCurrentWhenActive="page" text="Home Page"></Label>
 * ```
 */
@Directive({
  selector: '[nsRouterLinkActive]',
  exportAs: 'routerLinkActive',
  standalone: true,
})
export class NSRouterLinkActive implements OnChanges, OnDestroy, AfterContentInit {
  @ContentChildren(NSRouterLink, { descendants: true }) links!: QueryList<NSRouterLink>;

  private classes: string[] = [];
  private routerEventsSubscription: Subscription;
  private linkInputChangesSubscription?: Subscription;
  private _isActive = false;

  get isActive(): boolean {
    return this._isActive;
  }

  /**
   * Options to configure how to determine if the router link is active.
   *
   * These options are passed to the `isActive()` function.
   *
   * @see {@link isActive}
   */
  @Input() nsRouterLinkActiveOptions: { exact: boolean } | Partial<IsActiveMatchOptions> = { exact: false };

  /**
   * Aria-current attribute to apply when the router link is active.
   *
   * Possible values: `'page'` | `'step'` | `'location'` | `'date'` | `'time'` | `true` | `false`.
   *
   * @see {@link https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA/Attributes/aria-current}
   */
  @Input() ariaCurrentWhenActive?: 'page' | 'step' | 'location' | 'date' | 'time' | true | false;

  /**
   *
   * You can use the output `isActiveChange` to get notified each time the link becomes
   * active or inactive.
   *
   * Emits:
   * true  -> Route is active
   * false -> Route is inactive
   *
   * ```html
   * <Label
   *  [nsRouterLink]="/user/bob"
   *  [nsRouterLinkActive]="'active-link'"
   *  (isActiveChange)="this.onRouterLinkActive($event)" text="Bob"></Label>
   * ```
   */
  @Output() readonly isActiveChange: EventEmitter<boolean> = new EventEmitter();

  private readonly link = inject(NSRouterLink, { optional: true });
  private readonly router = inject(Router);
  private readonly element = inject(ElementRef);
  private readonly renderer = inject(Renderer2);
  private readonly cdr = inject(ChangeDetectorRef);

  constructor() {
    this.routerEventsSubscription = this.router.events.subscribe((s) => {
      if (s instanceof NavigationEnd) {
        this.update();
      }
    });
  }

  ngAfterContentInit(): void {
    // `of(null)` is used to force subscribe body to execute once immediately (like `startWith`).
    of(this.links.changes, of(null))
      .pipe(mergeAll())
      .subscribe(() => {
        this.update();
        this.subscribeToEachLinkOnChanges();
      });
  }

  private subscribeToEachLinkOnChanges() {
    this.linkInputChangesSubscription?.unsubscribe();
    const allLinkChanges = [...this.links.toArray(), this.link]
      .filter((link): link is NSRouterLink => !!link)
      .map((link) => link.onChanges);
    this.linkInputChangesSubscription = from(allLinkChanges)
      .pipe(mergeAll())
      .subscribe((link) => {
        if (this._isActive !== this.isLinkActive(this.router)(link)) {
          this.update();
        }
      });
  }

  @Input()
  set nsRouterLinkActive(data: string[] | string) {
    const classes = Array.isArray(data) ? data : data.split(' ');
    this.classes = classes.filter((c) => !!c);
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  ngOnChanges(_changes: SimpleChanges): void {
    this.update();
  }

  ngOnDestroy(): void {
    this.routerEventsSubscription.unsubscribe();
    this.linkInputChangesSubscription?.unsubscribe();
  }

  private update(): void {
    if (!this.links || !this.router.navigated) return;

    queueMicrotask(() => {
      const hasActiveLinks = this.hasActiveLinks();
      this.classes.forEach((c) => {
        if (hasActiveLinks) {
          this.renderer.addClass(this.element.nativeElement, c);
        } else {
          this.renderer.removeClass(this.element.nativeElement, c);
        }
      });
      if (hasActiveLinks && this.ariaCurrentWhenActive !== undefined) {
        this.renderer.setAttribute(this.element.nativeElement, 'aria-current', this.ariaCurrentWhenActive.toString());
      } else {
        this.renderer.removeAttribute(this.element.nativeElement, 'aria-current');
      }

      // Only emit change if the active state changed.
      if (this._isActive !== hasActiveLinks) {
        this._isActive = hasActiveLinks;
        this.cdr.markForCheck();
        // Emit on isActiveChange after classes are updated
        this.isActiveChange.emit(hasActiveLinks);
      }
    });
  }

  private isLinkActive(router: Router): (link: NSRouterLink) => boolean {
    const options: Partial<IsActiveMatchOptions> = isActiveMatchOptions(this.nsRouterLinkActiveOptions)
      ? this.nsRouterLinkActiveOptions
      : // While the types should disallow `undefined` here, it's possible without strict inputs
        (this.nsRouterLinkActiveOptions.exact ?? false)
        ? { ...exactMatchOptions }
        : { ...subsetMatchOptions };

    return (link: NSRouterLink) => {
      const urlTree = link.urlTree;
      return urlTree ? untracked(isActive(urlTree, router, options)) : false;
    };
  }

  private hasActiveLinks(): boolean {
    const isActiveCheckFn = this.isLinkActive(this.router);
    return (this.link && isActiveCheckFn(this.link)) || this.links.some(isActiveCheckFn);
  }
}
