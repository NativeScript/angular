import { NgFeature } from './feature.model';

/**
 * Curated highlights of the Angular 22 release.
 * Sourced from the Angular CHANGELOG (22.0.0 next/rc cycle).
 */
export const FEATURES: NgFeature[] = [
  {
    id: 'onpush-by-default',
    title: 'OnPush by Default',
    tagline: 'Components opt into fine-grained change detection out of the box.',
    category: 'Components',
    icon: '⚡',
    accent: '#E5006D',
    since: 'next.0',
    description: 'Components declared without an explicit `changeDetection` now default to `ChangeDetectionStrategy.OnPush` instead of `Default`. Combined with signals, this means views only re-render when their reactive inputs actually change.',
    why: 'Faster apps with zero ceremony — the performance-first path is now the default path. A migration adds `ChangeDetectionStrategy.Eager` only where legacy components truly need it.',
    demo: 'counter',
    code: `@Component({
  selector: 'profile-card',
  // 👇 no changeDetection needed — OnPush is the default
  template: \`<Label [text]="name()" />\`,
})
export class ProfileCard {
  name = input.required<string>();
}`,
  },
  {
    id: 'signal-forms',
    title: 'Signal Forms',
    tagline: 'Reactive, signal-powered forms — now public API.',
    category: 'Forms',
    icon: '🧩',
    accent: '#9D00FF',
    since: 'rc',
    description: 'The Signal Forms APIs graduated to the public API. Build forms from signals with template & reactive support, field-level validation, async/HTTP validators with debounce, and `FieldState.getError()` for ergonomic error access.',
    why: 'Forms become just another piece of your signal graph — no `valueChanges` subscriptions, no `ngModel` gymnastics. Validation is reactive and composable.',
    demo: 'signal-forms',
    code: `const f = form(signal({ email: '' }), (path) => {
  validateAsync(path.email, {
    debounce: 300,
    validator: (email) => checkUnique(email),
  });
});

// read errors anywhere — they're signals
f.email().getError();`,
  },
  {
    id: 'debounced-signals',
    title: 'Debounced Signals',
    tagline: 'Debounce reactive values without RxJS.',
    category: 'Signals',
    icon: '🎚️',
    accent: '#FF6B00',
    since: 'rc',
    description: 'Angular 22 adds first-class debouncing for signals, so rapidly changing values (typing, scrolling, dragging) can settle before downstream computeds and effects react.',
    why: 'The classic "search-as-you-type" pattern collapses to a couple of lines — no operators, no subscriptions, no teardown.',
    demo: 'debounce',
    code: `query = signal('');
// settles 300ms after the last keystroke
debounced = debounce(this.query, 300);

results = computed(() => search(this.debounced()));`,
  },
  {
    id: 'service-decorator',
    title: '@Service Decorator',
    tagline: 'A purpose-built decorator for injectables.',
    category: 'Components',
    icon: '🛎️',
    accent: '#00C2FF',
    since: 'rc',
    description: 'A new `@Service` decorator joins the family, expressing intent more clearly than the general-purpose `@Injectable` for the common "this is a service" case.',
    why: 'Clearer code: the decorator now names what the class is. Tooling and humans alike read intent at a glance.',
    demo: 'service',
    code: `@Service()
export class CartStore {
  private items = signal<Item[]>([]);
  total = computed(() =>
    this.items().reduce((n, i) => n + i.price, 0)
  );
}`,
  },
  {
    id: 'inject-async',
    title: 'injectAsync()',
    tagline: 'Await lazily-loaded dependencies inline.',
    category: 'Components',
    icon: '⏳',
    accent: '#19C37D',
    since: 'next',
    description: 'The new `injectAsync` helper resolves dependencies that are provided asynchronously or code-split, returning a promise you can await right where you need them.',
    why: 'Lazy providers become trivial to consume — no resolver boilerplate, no manual `EnvironmentInjector` juggling.',
    demo: 'inject-async',
    code: `export class Dashboard {
  async ngOnInit() {
    const charts = await injectAsync(ChartEngine);
    charts.render(this.data());
  }
}`,
  },
  {
    id: 'fetch-backend-default',
    title: 'Fetch by Default',
    tagline: 'HttpClient runs on the Fetch API now.',
    category: 'Resources & HTTP',
    icon: '🌐',
    accent: '#E5006D',
    since: 'next',
    description: '`FetchBackend` is now the default `HttpBackend` implementation, replacing `XMLHttpRequest`. A schematic keeps `HttpXhrBackend` for apps that still need XHR-only behaviors like upload progress.',
    why: 'Modern networking semantics, better streaming, and smaller surface area — with a clean migration path for the edge cases.',
    demo: 'http',
    code: `bootstrapApplication(App, {
  providers: [
    provideHttpClient(), // 👈 Fetch under the hood
  ],
});`,
  },
  {
    id: 'incremental-hydration',
    title: 'Incremental Hydration',
    tagline: 'Hydrate on interaction — now the default.',
    category: 'Performance',
    icon: '💧',
    accent: '#9D00FF',
    since: 'next',
    description: 'Incremental hydration is now the default behavior. Server-rendered markup stays dehydrated until a trigger (viewport, interaction, idle) hydrates just that island.',
    why: 'Ship interactive pages that hydrate only what the user touches — dramatically less JS executed up front.',
    code: `@defer (hydrate on interaction) {
  <CommentThread [postId]="id()" />
} @placeholder {
  <Label text="Tap to load comments" />
}`,
  },
  {
    id: 'resource-snapshots',
    title: 'Smarter Resources',
    tagline: 'SSR caching, sync values & status signals.',
    category: 'Resources & HTTP',
    icon: '📦',
    accent: '#00C2FF',
    since: 'rc',
    description: 'Resources gained the ability to cache for SSR, accept synchronous values for stream resources, expose special return statuses, and compose via snapshots — making them a complete async-state primitive.',
    why: 'One reactive primitive now covers fetch, stream, cache, and error states — replacing a tangle of effects and BehaviorSubjects.',
    demo: 'resource',
    code: `user = resource({
  params: () => ({ id: this.id() }),
  loader: ({ params }) => api.user(params.id),
});

// status is a signal: 'idle' | 'loading' | 'resolved' | 'error'
isLoading = computed(() => user.status() === 'loading');`,
  },
  {
    id: 'safe-navigation',
    title: 'Safe Navigation Narrowing',
    tagline: '?. now narrows nullable types correctly.',
    category: 'Templates',
    icon: '🛟',
    accent: '#19C37D',
    since: 'next',
    description: 'Safe navigation in templates now correctly narrows nullable types, and Angular expressions using optional chaining return `undefined` when a link in the chain is missing — matching TypeScript semantics.',
    why: 'Templates type-check the way you expect. Fewer false positives, fewer non-null assertions, more confidence.',
    demo: 'nullable',
    code: `<!-- user?.name is now correctly typed as string | undefined -->
@if (user()?.name; as name) {
  <Label [text]="name" />
}`,
  },
  {
    id: 'exhaustive-switch',
    title: 'Exhaustive @switch',
    tagline: 'Compile-time guarantees every case is handled.',
    category: 'Templates',
    icon: '🔀',
    accent: '#FF6B00',
    since: 'next',
    description: 'Switch blocks support exhaustive type-checking and can match multiple cases at once. Add a new variant to a union and the compiler tells you exactly which templates forgot to handle it.',
    why: 'The discriminated-union safety you love in TypeScript, now enforced in your templates.',
    demo: 'switch',
    code: `@switch (status()) {
  @case ('idle') { <Idle /> }
  @case ('loading') { <Spinner /> }
  @case ('error') { <ErrorView /> }
  // forget a case → compile error ✅
}`,
  },
  {
    id: 'defer-idle',
    title: '@defer Idle Controls',
    tagline: 'Idle timeouts & customizable idle behavior.',
    category: 'Performance',
    icon: '🕒',
    accent: '#E5006D',
    since: 'rc',
    description: 'Defer blocks gained support for idle timeouts and customization of the `on idle` trigger, including an optional timeout for idle deferred triggers — so background work loads predictably.',
    why: 'Fine-grained control over when low-priority islands load, without hand-rolling `requestIdleCallback`.',
    demo: 'defer',
    code: `@defer (on idle; timeout 3000) {
  <Recommendations />
} @placeholder {
  <Skeleton />
}`,
  },
  {
    id: 'web-mcp-tools',
    title: 'Web MCP Tools',
    tagline: 'Expose your app to AI agents.',
    category: 'Tooling & AI',
    icon: '🤖',
    accent: '#9D00FF',
    since: 'rc',
    description: 'New `provideWebMcpTools` and `declareWebMcpTool` APIs let your Angular app publish Model Context Protocol tools that AI agents can invoke directly against your running application.',
    why: 'Your UI becomes agent-operable. Ship structured, callable actions instead of hoping a model can scrape the DOM.',
    code: `provideWebMcpTools([
  declareWebMcpTool({
    name: 'add_to_cart',
    description: 'Add a product to the cart',
    handler: ({ sku }) => cart.add(sku),
  }),
]);`,
  },
  {
    id: 'ai-debugging',
    title: 'In-Page AI Debugging',
    tagline: 'A live DI graph for AI tooling.',
    category: 'Tooling & AI',
    icon: '🧠',
    accent: '#00C2FF',
    since: 'rc',
    description: 'Angular 22 registers AI runtime debugging tools and implements an in-page Angular DI graph tool, plus profiling enhanced with documentation URLs — making the framework introspectable by assistants.',
    why: 'Debugging copilots can reason about your real injector tree and change-detection profile, not just your source.',
    code: `// Profiling entries now link straight to docs,
// and the DI graph is queryable at runtime by
// AI debugging tools — zero setup required.`,
  },
  {
    id: 'router-browser-url',
    title: 'Router browserUrl',
    tagline: 'Decouple the visible URL from the route.',
    category: 'Router',
    icon: '🧭',
    accent: '#19C37D',
    since: 'rc',
    description: 'Router links gained a `browserUrl` input, and `withComponentInputBinding` gained an `options` parameter plus an `unmatchedInputBehavior` option for precise control over how route data flows into component inputs.',
    why: 'Show a clean address while routing somewhere else, and tune exactly how params bind to inputs.',
    code: `<a [routerLink]="['/checkout']"
   [browserUrl]="'/order/' + id()">
  Checkout
</a>

provideRouter(routes,
  withComponentInputBinding({ unmatchedInputBehavior: 'ignore' }));`,
  },
  {
    id: 'testbed-getfixture',
    title: 'TestBed.getFixture',
    tagline: 'Grab the latest fixture, no variable needed.',
    category: 'Testing',
    icon: '🧪',
    accent: '#FF6B00',
    since: 'rc',
    description: 'New `TestBed.getFixture` / `TestBed.getLastFixture` retrieve the most recently created fixture, and `Testability` now uses `PendingTasks` as its stability indicator for more reliable async tests.',
    why: 'Less boilerplate in every spec, and flakier async assertions become deterministic.',
    code: `it('renders the title', () => {
  TestBed.createComponent(Header);
  const fixture = TestBed.getFixture(); // 🎉
  expect(fixture.nativeElement.textContent)
    .toContain('Angular 22');
});`,
  },
  {
    id: 'shadow-root-bootstrap',
    title: 'Shadow Root Bootstrap',
    tagline: 'Boot Angular inside shadow DOM.',
    category: 'Components',
    icon: '🌑',
    accent: '#E5006D',
    since: 'rc',
    description: 'Angular apps can now bootstrap underneath shadow roots, and you can bootstrap via `ApplicationRef` with config — ideal for widgets, micro-frontends, and design-system embeds that need true style encapsulation.',
    why: 'Drop a fully isolated Angular island into any host page without style bleed in either direction.',
    code: `const host = document.querySelector('#widget')!
  .attachShadow({ mode: 'open' });

bootstrapApplication(Widget, {
  providers: [/* ... */],
}, host); // 👈 bootstrap into the shadow root`,
  },
];
