import { booleanAttribute, computed, Directive, ElementRef, inject, Input, NgZone, OnChanges, OnDestroy, signal, SimpleChanges, untracked } from '@angular/core';
import { ActivatedRoute, NavigationExtras, QueryParamsHandling, Router, UrlTree } from '@angular/router';
import { NavigationTransition } from '@nativescript/core';
import { Subject } from 'rxjs';
import { NativeScriptDebug } from '../../trace';
import { RouterExtensions } from './router-extensions';
import { NavigationOptions } from './ns-location-utils';

function isUrlTree(value: any): value is UrlTree {
  return value instanceof UrlTree;
}

/**
 * The nsRouterLink directive lets you link to specific parts of your app.
 *
 * Consider the following route configuration:
 * ```
 * [{ path: 'user/:name', component: UserCmp }]
 * ```
 *
 * When linking to this `User` route, you can write:
 *
 * ```
 * <Label [nsRouterLink]="['/user/bob']" text="link to user component"></Label>
 * ```
 *
 * You can use dynamic values to generate the link.
 * For a dynamic link, pass an array of path segments,
 * followed by the params for each segment.
 * For example, `['/team', teamId, 'user', userName, {details: true}]`
 * generates a link to `/team/11/user/bob;details=true`.
 *
 * Multiple static segments can be merged into one term and combined with
 * dynamic segments. For example, `['/team/11/user', userName, {details: true}]`
 *
 * The input that you provide to the link is treated as a delta to the current
 * URL. For instance, suppose the current URL is `/user/(box//aux:team)`. The
 * link `<Label [nsRouterLink]="['/user/jim']">Jim</Label>` creates the URL
 * `/user/(jim//aux:team)`.
 * See {@link Router#createUrlTree} for more information.
 *
 * @usageNotes
 *
 * You can use absolute or relative paths in a link, set query parameters,
 * control how parameters are handled, and keep a history of navigation states.
 *
 * ### Relative link paths
 *
 * The first segment name can be prepended with `/`, `./`, or `../`.
 * * If the first segment begins with `/`, the router looks up the route from
 * the root of the app.
 * * If the first segment begins with `./`, or doesn't begin with a slash, the
 * router looks in the children of the current activated route.
 * * If the first segment begins with `../`, the router goes up one level in the
 * route tree.
 *
 * ### Setting and handling query params and fragments
 *
 * The following link adds a query parameter and a fragment to the generated URL:
 *
 * ```html
 * <Label [nsRouterLink]="['/user/bob']" [queryParams]="{debug: true}"
 * fragment="education" text="link to user component"></Label>
 * ```
 *
 * By default, the directive constructs the new URL using the given query
 * parameters. The example generates the link: `/user/bob?debug=true#education`.
 *
 * You can instruct the directive to handle query parameters differently
 * by specifying the `queryParamsHandling` option in the link.
 * Allowed values are:
 *
 *  - `'merge'`: Merge the given `queryParams` into the current query params.
 *  - `'preserve'`: Preserve the current query params.
 *
 * For example:
 *
 * ```html
 * <Label [nsRouterLink]="['/user/bob']" [queryParams]="{debug: true}"
 * queryParamsHandling="merge" text="link to user component"></Label>
 * ```
 *
 * `queryParams`, `fragment`, `queryParamsHandling`, `preserveFragment`, and
 * `relativeTo` cannot be used when the `nsRouterLink` input is a `UrlTree`.
 *
 * ### NativeScript-specific options
 *
 * NativeScript adds support for page transitions and history clearing:
 *
 * ```html
 * <Label [nsRouterLink]="['/user/bob']" [clearHistory]="true"
 * pageTransition="slide" [pageTransitionDuration]="200"
 * text="link to user component"></Label>
 * ```
 */
@Directive({
  selector: '[nsRouterLink]',
  standalone: true,
})
export class NSRouterLink implements OnChanges, OnDestroy {
  private readonly ngZone = inject(NgZone);
  private readonly router = inject(Router);
  private readonly navigator = inject(RouterExtensions);
  private readonly route = inject(ActivatedRoute);
  private readonly el = inject(ElementRef);

  /**
   * Passed to {@link Router#createUrlTree} as part of the
   * `UrlCreationOptions`.
   * @see {@link UrlCreationOptions#queryParams}
   * @see {@link Router#createUrlTree}
   */
  @Input() set queryParams(value: { [k: string]: any } | null | undefined) {
    this._queryParams.set(value);
  }
  get queryParams(): { [k: string]: any } | null | undefined {
    return untracked(this._queryParams);
  }
  // Rather than trying deep equality checks or serialization, just allow urlTree to recompute
  // whenever queryParams change (which will be rare).
  private _queryParams = signal<{ [k: string]: any } | null | undefined>(undefined, { equal: () => false });

  /**
   * Passed to {@link Router#createUrlTree} as part of the
   * `UrlCreationOptions`.
   * @see {@link UrlCreationOptions#fragment}
   * @see {@link Router#createUrlTree}
   */
  @Input() set fragment(value: string | undefined) {
    this._fragment.set(value);
  }
  get fragment(): string | undefined {
    return untracked(this._fragment);
  }
  private _fragment = signal<string | undefined>(undefined);

  /**
   * Passed to {@link Router#createUrlTree} as part of the
   * `UrlCreationOptions`.
   * @see {@link UrlCreationOptions#queryParamsHandling}
   * @see {@link Router#createUrlTree}
   */
  @Input() set queryParamsHandling(value: QueryParamsHandling | null | undefined) {
    this._queryParamsHandling.set(value);
  }
  get queryParamsHandling(): QueryParamsHandling | null | undefined {
    return untracked(this._queryParamsHandling);
  }
  private _queryParamsHandling = signal<QueryParamsHandling | null | undefined>(undefined);

  /**
   * Passed to {@link Router#navigateByUrl} as part of the
   * `NavigationBehaviorOptions`.
   * @see {@link NavigationBehaviorOptions#state}
   * @see {@link Router#navigateByUrl}
   */
  @Input() set state(value: { [k: string]: any } | undefined) {
    this._state.set(value);
  }
  get state(): { [k: string]: any } | undefined {
    return untracked(this._state);
  }
  private _state = signal<{ [k: string]: any } | undefined>(undefined, { equal: () => false });

  /**
   * Passed to {@link Router#navigateByUrl} as part of the
   * `NavigationBehaviorOptions`.
   * @see {@link NavigationBehaviorOptions#info}
   * @see {@link Router#navigateByUrl}
   */
  @Input() set info(value: unknown) {
    this._info.set(value);
  }
  get info(): unknown {
    return untracked(this._info);
  }
  private _info = signal<unknown>(undefined, { equal: () => false });

  /**
   * Passed to {@link Router#createUrlTree} as part of the
   * `UrlCreationOptions`.
   * Specify a value here when you do not want to use the default value
   * for `nsRouterLink`, which is the current activated route.
   * Note that a value of `undefined` here will use the `nsRouterLink` default.
   * @see {@link UrlCreationOptions#relativeTo}
   * @see {@link Router#createUrlTree}
   */
  @Input() set relativeTo(value: ActivatedRoute | null | undefined) {
    this._relativeTo.set(value);
  }
  get relativeTo(): ActivatedRoute | null | undefined {
    return untracked(this._relativeTo);
  }
  private _relativeTo = signal<ActivatedRoute | null | undefined>(undefined);

  /**
   * Passed to {@link Router#createUrlTree} as part of the
   * `UrlCreationOptions`.
   * @see {@link UrlCreationOptions#preserveFragment}
   * @see {@link Router#createUrlTree}
   */
  @Input({ transform: booleanAttribute }) set preserveFragment(value: boolean) {
    this._preserveFragment.set(value);
  }
  get preserveFragment(): boolean {
    return untracked(this._preserveFragment);
  }
  private _preserveFragment = signal<boolean>(false);

  /**
   * Passed to {@link Router#navigateByUrl} as part of the
   * `NavigationBehaviorOptions`.
   * @see {@link NavigationBehaviorOptions#skipLocationChange}
   * @see {@link Router#navigateByUrl}
   */
  @Input({ transform: booleanAttribute }) set skipLocationChange(value: boolean) {
    this._skipLocationChange.set(value);
  }
  get skipLocationChange(): boolean {
    return untracked(this._skipLocationChange);
  }
  private _skipLocationChange = signal<boolean>(false);

  /**
   * Passed to {@link Router#navigateByUrl} as part of the
   * `NavigationBehaviorOptions`.
   * @see {@link NavigationBehaviorOptions#replaceUrl}
   * @see {@link Router#navigateByUrl}
   */
  @Input({ transform: booleanAttribute }) set replaceUrl(value: boolean) {
    this._replaceUrl.set(value);
  }
  get replaceUrl(): boolean {
    return untracked(this._replaceUrl);
  }
  private _replaceUrl = signal<boolean>(false);

  // NativeScript-specific inputs
  @Input() clearHistory: boolean;
  @Input() pageTransition: boolean | string | NavigationTransition = true;
  @Input() pageTransitionDuration;

  /** @internal */
  onChanges = new Subject<NSRouterLink>();

  private routerLinkInput = signal<readonly any[] | UrlTree | null>(null);

  private tapHandler: () => void;

  constructor() {
    // NativeScript uses tap events instead of click events
    this.tapHandler = () => {
      this.ngZone.run(() => {
        this.onTap();
      });
    };
    this.el.nativeElement.on('tap', this.tapHandler);
  }

  /**
   * Commands to pass to {@link Router#createUrlTree} or a `UrlTree`.
   *   - **array**: commands to pass to {@link Router#createUrlTree}.
   *   - **string**: shorthand for array of commands with just the string, i.e. `['/route']`
   *   - **UrlTree**: a `UrlTree` for this link rather than creating one from
   * the commands and other inputs that correspond to properties of `UrlCreationOptions`.
   *   - **null|undefined**: effectively disables the `nsRouterLink`
   * @see {@link Router#createUrlTree}
   */
  @Input()
  set nsRouterLink(commandsOrUrlTree: readonly any[] | string | UrlTree | null | undefined) {
    if (commandsOrUrlTree == null) {
      this.routerLinkInput.set(null);
    } else {
      if (isUrlTree(commandsOrUrlTree)) {
        this.routerLinkInput.set(commandsOrUrlTree);
      } else {
        this.routerLinkInput.set(Array.isArray(commandsOrUrlTree) ? commandsOrUrlTree : [commandsOrUrlTree]);
      }
    }
  }

  // This is subscribed to by `NSRouterLinkActive` so that it knows to update
  // when there are changes to the RouterLinks it's tracking.
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  ngOnChanges(_changes?: SimpleChanges): void {
    this.onChanges.next(this);
  }

  ngOnDestroy(): void {
    this.el.nativeElement.off('tap', this.tapHandler);
  }

  /** @internal */
  _urlTree = computed(() => {
    const routerLinkInput = this.routerLinkInput();
    if (routerLinkInput === null || !this.router.createUrlTree) {
      return null;
    } else if (isUrlTree(routerLinkInput)) {
      return routerLinkInput;
    }
    return this.router.createUrlTree(routerLinkInput, {
      // If the `relativeTo` input is not defined, we want to use `this.route`
      // by default.
      // Otherwise, we should use the value provided by the user in the input.
      relativeTo: this._relativeTo() !== undefined ? this._relativeTo() : this.route,
      queryParams: this._queryParams(),
      fragment: this._fragment(),
      queryParamsHandling: this._queryParamsHandling(),
      preserveFragment: this._preserveFragment(),
    });
  });

  get urlTree(): UrlTree | null {
    return untracked(this._urlTree);
  }

  // NativeScript tap handler - replaces click handler from upstream
  private onTap() {
    const urlTree = this.urlTree;

    if (urlTree === null) {
      return;
    }

    if (NativeScriptDebug.isLogEnabled()) {
      NativeScriptDebug.routerLog(`nsRouterLink.tapped: ${this.routerLinkInput()} ` + `clear: ${this.clearHistory} ` + `transition: ${JSON.stringify(this.pageTransition)} ` + `duration: ${this.pageTransitionDuration}`);
    }

    const extras = this.getExtras();
    const routerLinkInput = this.routerLinkInput();

    // When the input is a UrlTree, use navigateByUrl directly.
    // Otherwise, use navigate with commands array.
    if (isUrlTree(routerLinkInput)) {
      this.navigator.navigateByUrl(urlTree, extras);
    } else {
      this.navigator.navigate(routerLinkInput as any[], {
        ...extras,
        // If the `relativeTo` input is not defined, we want to use `this.route`
        // by default.
        relativeTo: this._relativeTo() !== undefined ? this._relativeTo() : this.route,
        queryParams: this._queryParams(),
        fragment: this._fragment(),
        queryParamsHandling: this._queryParamsHandling(),
        preserveFragment: this._preserveFragment(),
      });
    }
  }

  private getExtras(): NavigationExtras & NavigationOptions {
    const transition = this.getTransition();
    return {
      skipLocationChange: this.skipLocationChange,
      replaceUrl: this.replaceUrl,
      state: this.state,
      info: this.info,

      // NativeScript-specific navigation options
      clearHistory: this.convertClearHistory(this.clearHistory),
      animated: transition.animated,
      transition: transition.transition,
    };
  }

  private convertClearHistory(value: boolean | string): boolean {
    return value === true || value === 'true';
  }

  // NativeScript-specific page transition handling
  private getTransition(): { animated: boolean; transition?: NavigationTransition } {
    let transition: NavigationTransition;
    let animated: boolean;

    if (typeof this.pageTransition === 'boolean') {
      animated = this.pageTransition;
    } else if (typeof this.pageTransition === 'string') {
      if (this.pageTransition === 'none' || this.pageTransition === 'false') {
        animated = false;
      } else {
        animated = true;
        transition = {
          name: <string>this.pageTransition,
        };
      }
    } else {
      animated = true;
      transition = <NavigationTransition>this.pageTransition;
    }

    const duration = +this.pageTransitionDuration;
    if (!isNaN(duration)) {
      transition = transition || {};
      transition.duration = duration;
    }

    return { animated, transition };
  }
}
