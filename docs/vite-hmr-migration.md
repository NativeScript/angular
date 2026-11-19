# Vite HMR: migrating from the old globals (experimental)

> **Status: experiment.** This compatibility layer lives on the `experiment/vite-hmr-compat` branches of `NativeScript/angular` and `NativeScript/NativeScript`. It is built on the Vite dev model of `feat/web-style-hmr` (`@nativescript/angular`) and `feat/vite-thin-client` (`@nativescript/vite`). Names and behaviour may change.

The earlier `@nativescript/vite` Angular integration (the `feat/vite-hmr` branch of this repo and the pre-thin `@nativescript/vite`) drove HMR through `globalThis.__NS_*` globals. The new model has no such globals: it uses Vite's own `import.meta.hot` and an HMR boundary at the app entry. This guide maps every old global and API to its replacement, and describes the opt-in shims that keep old code running while you migrate.

## Quick start

1. Import the Vite shims first in `main.ts`, and add the compat provider:

   ```ts
   import '@nativescript/vite/hmr-compat'; // first import: defines the deprecated @nativescript/vite globals
   import {
     bootstrapApplication,
     provideNativeScriptHmrCompat,
     provideNativeScriptRouter,
     runNativeScriptAngularApp,
   } from '@nativescript/angular';
   import { DetailsDialog } from './app/details-dialog.component';

   runNativeScriptAngularApp({
     appModuleBootstrap: () =>
       bootstrapApplication(AppComponent, {
         providers: [
           provideNativeScriptRouter(routes),
           // After any START_PATH provider of your own.
           provideNativeScriptHmrCompat({ dialogComponents: [DetailsDialog] }),
         ],
       }),
   });
   ```

2. Run the app and watch the console: each deprecated global you still use prints one warning naming its replacement. Replace them one by one (see the [mapping](#mapping)).
3. Once nothing warns, drop `import '@nativescript/vite/hmr-compat'` and pass `globals: false` to the provider. Keep the provider itself for route restore, dialog restore and the `HmrCacheService` options.

Everything here is dev only. `@nativescript/vite/hmr-compat` runs inside `if (import.meta.hot)`, and `provideNativeScriptHmrCompat()` returns no providers outside a Vite dev session. Webpack and release builds see neither, except for the `cache` option.

## The new model in brief

- **Soft reboot.** `@nativescript/vite` makes the app entry (`main.ts`) a self-accepting HMR boundary. An edit Vite can't apply closer to the edited file propagates to the entry. The device disposes the entry, which calls `prepareHmrReboot()`: it saves the HMR participants, tears Angular down, and resets compiled components. The device then re-imports the entry with a fresh `?t=`, so only the edited module and its importer chain re-evaluate. Unchanged modules, `@nativescript/angular` included, keep their instances and module state. The re-evaluated entry calls `runNativeScriptAngularApp`, which bootstraps right away. Once the app is stable (capped at 5 s), the participants restore.
- **In place.** Template and style edits (`.html`, `styleUrl`, a `.ts` save that only touches `template`/`styles`) update in place through Angular's own HMR, without a reboot.
- **App restart.** Anything a hot update can't apply becomes a real process restart, done by the NativeScript CLI: a Vite `full-reload`, a `decline()`d module, an edit to `node_modules` or linked core, a changed boot bundle, a teardown that threw. `requestNativeScriptAppRestart(reason)` asks for one from app code.
- **Events.** They are dispatched on the device through `import.meta.hot.on(event, cb)` and awaited:

  | Event                                    | When                                                      | Payload                                                          |
  | ---------------------------------------- | --------------------------------------------------------- | ---------------------------------------------------------------- |
  | `vite:beforeUpdate` / `vite:afterUpdate` | around every update                                       | Vite's `UpdatePayload`                                           |
  | `nativescript:beforeReboot`              | before an entry (soft reboot) update                      | `{ entry, changed, rerun, modules, isRerun(id), isChanged(id) }` |
  | `nativescript:beforeRerun`               | before any `dispose`, **only** to modules about to re-run | `{ timestamp, changed, rerun, modules, isRerun, isChanged }`     |
  | `nativescript:afterReboot`               | after the new app bootstrapped, settled and restored      | the `beforeReboot` payload, plus `error` on failure              |
  | `nativescript:beforeRestart`             | before an app restart                                     | `{ reason }`                                                     |

  Order: `vite:beforeUpdate` → `nativescript:beforeReboot` → `nativescript:beforeRerun` → entry `dispose` → `import(entry?t=)` → bootstrap and restore → `nativescript:afterReboot` → `vite:afterUpdate`. Add `@nativescript/vite/client` to `compilerOptions.types` for typed payloads.

- **Participants** (`NATIVESCRIPT_HMR_PARTICIPANTS`) carry app state across a soft reboot: `save()` runs in the old app before teardown, `restore(state)` in the new one. The compat layer's route and dialog restore are participants.
- **`import.meta.hot.dispose` / `data`** keep Vite's semantics. `dispose` runs only for the accepted module (the entry for a soft reboot); `hot.data` survives a hot update of the same module, and an app restart wipes it.

## Mapping

| Old                                                                                                               | Replacement                                                                             | Shim                                                             |
| ----------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------- | ---------------------------------------------------------------- |
| `__NS_UPDATE_ANGULAR_APP_OPTIONS__`                                                                               | nothing: the re-evaluated entry passes its new options to `runNativeScriptAngularApp`   | no-op, warns                                                     |
| `__NS_ANGULAR_HMR_REGISTER_ONLY__`                                                                                | nothing: the re-evaluated entry always bootstraps                                       | always `false`, warns                                            |
| `__reboot_ng_modules__(disposePlatform?)`                                                                         | an edit reboots through the entry boundary; state goes through participants             | re-bootstraps the running app in place, with participants, warns |
| `__dispose_app_ng_modules__`, `__dispose_app_ng_platform__`, `__bootstrap_app_ng_modules__`, `__cleanup_ng_hot__` | `prepareHmrReboot()` / `whenHmrRebootSettled()`, called by the entry boundary           | no-op, warns                                                     |
| `__NS_NG_HMR__`                                                                                                   | `isAngularHmrRestoringRoute()`, `getAngularHmrRestoringRoute()`, `HmrCacheService`      | read-only view, warns                                            |
| `__NS_HMR_REGISTER_COMPONENT__(name, cls)`                                                                        | `provideNativeScriptHmrCompat({ dialogComponents })`                                    | feeds dialog restore, warns                                      |
| `__reset_ng_compiled_components__`                                                                                | nothing: `prepareHmrReboot()` resets compiled components                                | calls `ɵresetCompiledComponents()`, warns                        |
| `__NS_HOT_REGISTRY__.on/off`                                                                                      | `import.meta.hot.on/off` in the module that owns the listener                           | forwards to the compat module's hot context, warns               |
| `__NS_HOT_REGISTRY__.dispatchHotEvent`                                                                            | none for app code; prefer a plain function call or `import.meta.hot.send` to the server | dispatches to every device `hot.on` listener, warns              |
| `__NS_HMR_ON_UPDATE__` / `onHmrUpdate(handler, id)`                                                               | `import.meta.hot.on('vite:afterUpdate', cb)`, or `nativescript:afterReboot`             | called once per update, warns                                    |
| `__NS_DEV_ORIGIN__`                                                                                               | `new URL(import.meta.url).origin` inside `if (import.meta.hot)`                         | returns the dev-server origin, warns                             |
| `__NS_HTTP_ORIGIN__`                                                                                              | `new URL(import.meta.url).origin` inside `if (import.meta.hot)`                         | not shimmed: the dev runtime still sets it                       |
| `registerHmrHooks(name, { beforeDispose, afterBootstrap })`                                                       | a `NATIVESCRIPT_HMR_PARTICIPANTS` provider                                              | none (it was internal)                                           |
| `HmrCacheService`, `configureHmrCache`                                                                            | same API, from `@nativescript/angular`                                                  | not a shim                                                       |
| `isAngularHmrRestoringRoute()`, `getAngularHmrRestoringRoute()`                                                   | same API; needs `provideNativeScriptHmrCompat()`                                        | not a shim                                                       |
| `NativeDialogConfig.preserveOnHmr`                                                                                | same option; needs `provideNativeScriptHmrCompat()`                                     | not a shim                                                       |
| `NSRouteReuseStrategy.clearAllCaches()`                                                                           | same method; the provider calls it on any `RouteReuseStrategy` that has it              | not a shim                                                       |

Every shim warns once per process, on its first use (call, read or write). The exact text of each warning is below.

### `__NS_UPDATE_ANGULAR_APP_OPTIONS__` and `__NS_ANGULAR_HMR_REGISTER_ONLY__`

The old client re-imported the entry with `__NS_ANGULAR_HMR_REGISTER_ONLY__` set, and the entry handed its fresh options to the running app through `__NS_UPDATE_ANGULAR_APP_OPTIONS__`. Now the running app is torn down first and the re-imported entry bootstraps normally, so neither is needed. Delete the code that reads or calls them.

```ts
// Before
if (!globalThis.__NS_ANGULAR_HMR_REGISTER_ONLY__) {
  runNativeScriptAngularApp(options);
}
// After
runNativeScriptAngularApp(options);
```

```text
[@nativescript/angular] globalThis.__NS_UPDATE_ANGULAR_APP_OPTIONS__ is deprecated and does nothing: the re-evaluated app entry calls runNativeScriptAngularApp with its new options itself. Remove the call. See docs/vite-hmr-migration.md in NativeScript/angular.
```

```text
[@nativescript/angular] globalThis.__NS_ANGULAR_HMR_REGISTER_ONLY__ is deprecated and always false: the re-evaluated app entry always bootstraps. Remove the check. See docs/vite-hmr-migration.md in NativeScript/angular.
```

### The `__reboot_ng_modules__` family

Under Vite these were the old client's way to tear down and re-bootstrap Angular. An edit now does that through the entry boundary. The shim keeps `__reboot_ng_modules__(disposePlatform?)` working: it re-bootstraps the running app with the code it already has, saving and restoring participants as a soft reboot does. The other four are no-ops. Under webpack (`import.meta.webpackHot`), `runNativeScriptAngularApp` still defines the whole family itself; the shims never replace an existing global.

```ts
// Before: force a re-bootstrap after changing something global
globalThis.__reboot_ng_modules__?.(false);
// After: keep the state in a participant and let the next edit reboot;
// for a full clean slate, ask for an app restart.
requestNativeScriptAppRestart('locale changed');
```

```text
[@nativescript/angular] globalThis.__reboot_ng_modules__ is deprecated: it re-bootstraps the running app in place, carrying HMR participant state. Edits already reboot through the app entry's HMR boundary; keep state across reboots with a NATIVESCRIPT_HMR_PARTICIPANTS provider. See docs/vite-hmr-migration.md in NativeScript/angular.
```

```text
[@nativescript/angular] globalThis.__dispose_app_ng_modules__ is deprecated and does nothing under Vite: the app entry is an HMR boundary, so prepareHmrReboot() tears the app down and the re-evaluated entry bootstraps it. See docs/vite-hmr-migration.md in NativeScript/angular.
```

```text
[@nativescript/angular] globalThis.__dispose_app_ng_platform__ is deprecated and does nothing under Vite: the app entry is an HMR boundary, so prepareHmrReboot() tears the app down and the re-evaluated entry bootstraps it. See docs/vite-hmr-migration.md in NativeScript/angular.
```

```text
[@nativescript/angular] globalThis.__bootstrap_app_ng_modules__ is deprecated and does nothing under Vite: the app entry is an HMR boundary, so prepareHmrReboot() tears the app down and the re-evaluated entry bootstraps it. See docs/vite-hmr-migration.md in NativeScript/angular.
```

```text
[@nativescript/angular] globalThis.__cleanup_ng_hot__ is deprecated and does nothing under Vite: the app entry is an HMR boundary, so prepareHmrReboot() tears the app down and the re-evaluated entry bootstraps it. See docs/vite-hmr-migration.md in NativeScript/angular.
```

### `__NS_NG_HMR__`

The old shared state object. The shim returns a read-only snapshot: `{ route: { restoring }, components, cache, dialogs: [], hooks }`. Assigning to it does nothing.

```ts
// Before
if (globalThis.__NS_NG_HMR__?.route.restoring) return;
// After
import { isAngularHmrRestoringRoute } from '@nativescript/angular';
if (isAngularHmrRestoringRoute()) return;
```

```text
[@nativescript/angular] globalThis.__NS_NG_HMR__ is deprecated and read-only: use isAngularHmrRestoringRoute()/getAngularHmrRestoringRoute() and HmrCacheService from @nativescript/angular. See docs/vite-hmr-migration.md in NativeScript/angular.
```

### `__NS_HMR_REGISTER_COMPONENT__`

The old server injected a call into every component module, so dialog restore could reopen an edited dialog with its new class. Nothing injects it now. List your preserved dialog components in the provider instead. The entry re-evaluates on every reboot, so the list holds the new classes:

```ts
provideNativeScriptHmrCompat({ dialogComponents: [DetailsDialog, FilterDialog] });
```

Calls to the shim still register a class by name for dialog restore.

```text
[@nativescript/angular] globalThis.__NS_HMR_REGISTER_COMPONENT__ is deprecated: list the components of dialogs opened with preserveOnHmr in provideNativeScriptHmrCompat({ dialogComponents }). See docs/vite-hmr-migration.md in NativeScript/angular.
```

### `__reset_ng_compiled_components__`

`prepareHmrReboot()` calls `ɵresetCompiledComponents()` on every soft reboot. Delete the call. The shim still forwards to it.

```text
[@nativescript/angular] globalThis.__reset_ng_compiled_components__ is deprecated: prepareHmrReboot() already resets compiled components on every reboot. Remove the call. See docs/vite-hmr-migration.md in NativeScript/angular.
```

### `__NS_HOT_REGISTRY__`

A listener belongs to the module that registers it. Use that module's own `import.meta.hot`: Vite drops its listeners when the module re-evaluates, so they never stack up.

```ts
// Before
globalThis.__NS_HOT_REGISTRY__?.on('vite:afterUpdate', onUpdate);
// After
import.meta.hot?.on('vite:afterUpdate', onUpdate);
```

The shim forwards `on`/`off` to the hot context of `@nativescript/vite/hmr-compat`, which never re-evaluates. Listeners added through it therefore live until `off` or an app restart, like the old registry's, and never receive `nativescript:beforeRerun`, which goes only to modules that re-run. `dispatchHotEvent(event, payload)` dispatches to every device listener and returns how many there were.

```text
[@nativescript/vite] globalThis.__NS_HOT_REGISTRY__ is deprecated: call import.meta.hot.on/off in the module that owns the listener, and remove root listeners on nativescript:beforeRerun. Listeners added through this shim are never removed when their module re-runs. See docs/vite-hmr-migration.md in NativeScript/angular.
```

### `__NS_HMR_ON_UPDATE__` (and `onHmrUpdate`)

```ts
// Before
globalThis.__NS_HMR_ON_UPDATE__ = ({ changedIds }) => refresh(changedIds);
// After: every update, soft reboots included
import.meta.hot?.on('vite:afterUpdate', (payload) => refresh(payload.updates.map((u) => u.path)));
// After: soft reboots only, with the edited files
import.meta.hot?.on('nativescript:afterReboot', (e) => refresh(e.changed));
```

The shim calls the hook once per update, after `vite:afterUpdate`, which follows `nativescript:afterReboot` for a soft reboot. It passes `{ type: 'delta', version, changedIds, raw }`, where `changedIds` holds the Vite URLs of the edited files (the updated modules if the server did not announce them) and `raw` is Vite's `UpdatePayload`. `full-graph` payloads no longer exist. Setting the global replaces the hook.

```text
[@nativescript/vite] globalThis.__NS_HMR_ON_UPDATE__ is deprecated: use import.meta.hot.on('vite:afterUpdate', cb), or nativescript:afterReboot for soft reboots. See docs/vite-hmr-migration.md in NativeScript/angular.
```

### `__NS_DEV_ORIGIN__` and `__NS_HTTP_ORIGIN__`

A module served by the dev server knows its origin:

```ts
if (import.meta.hot) {
  const origin = new URL(import.meta.url).origin;
}
```

`__NS_HTTP_ORIGIN__` is not shimmed: the dev runtime still sets it for its own use (the worker URL rewrite), until the remaining runtime globals move behind one `Symbol.for('nativescript.dev')` object. Don't build new code on it.

```text
[@nativescript/vite] globalThis.__NS_DEV_ORIGIN__ is deprecated: use new URL(import.meta.url).origin inside if (import.meta.hot). See docs/vite-hmr-migration.md in NativeScript/angular.
```

## What the compat provider does

`provideNativeScriptHmrCompat(options?)`:

| Option                    | Default | Effect                                                                                            |
| ------------------------- | ------- | ------------------------------------------------------------------------------------------------- |
| `route`                   | `true`  | Route restore participant.                                                                        |
| `clearRouteReuseStrategy` | —       | Clears a custom `RouteReuseStrategy` that has no `clearAllCaches()` method.                       |
| `dialogs`                 | `true`  | Dialog restore participant.                                                                       |
| `dialogComponents`        | `[]`    | Classes of preserved dialogs, matched by class name.                                              |
| `cache`                   | —       | `HmrCacheService` options (`maxEntries`, 256 by default, 0 for no limit). Applies in every build. |
| `globals`                 | `true`  | Calls `installAngularHmrCompatGlobals()`.                                                         |

**Route restore.** Before teardown the participant saves `router.url`. It then destroys the detached pages of the `RouteReuseStrategy` (through `clearAllCaches()`, which `NSRouteReuseStrategy` has), and clears the router's private route-config caches (`_loadedRoutes`, `_loadedComponent`, `_injector`, …). Route configs that don't re-evaluate would otherwise hand injectors of the destroyed app to the new router. While the restore is pending, the provider supplies `START_PATH`, so the new app boots at the old URL. Named outlets can't be part of a start path, so it boots at the primary-only URL and then navigates to the full URL. It also navigates when the app ended up somewhere else (a `START_PATH` of yours listed after the provider, or your own start-up navigation). The navigation runs with `animated: false`. `isAngularHmrRestoringRoute()` is true from teardown until 1 s after the restore, so your start-up code can step aside:

```ts
export class AppComponent {
  constructor() {
    if (!isAngularHmrRestoringRoute()) {
      inject(Router).navigate(['/login']);
    }
  }
}
```

If you build your providers once at module level (e.g. an `app.config.ts` that the reboot doesn't re-evaluate), the provider can't add `START_PATH`. The app then boots at its usual start path and navigates to the old URL after boot.

**Dialog restore.** Open a dialog with `preserveOnHmr: true`. Before teardown the participant records each open component dialog: its class, name and config, minus `viewContainerRef` and `injector`. After the new app's root view loads, it reopens them in the root view, without animation. It uses the class from `dialogComponents` with the same name, then one registered through the shim, then the old class.

**`HmrCacheService`.** It is the same API as before (`get`, `set`, `has`, `delete`, `clear`, `size`, `keys`, `scope(name)`, `isHmr`). Its store lives in `@nativescript/angular`'s module scope, which a soft reboot never re-evaluates, so it survives reboots without any global. An app restart clears it. In release it is a plain in-memory LRU.

## Writing a participant

A participant saves state from the old app and restores it into the new one. Snapshots stay in memory, so they may hold live objects. Bump `version` when the snapshot shape changes: a snapshot with another version is skipped, not restored. A participant that throws is logged and skipped, and the others still run.

```ts
import { inject, makeEnvironmentProviders } from '@angular/core';
import {
  NATIVESCRIPT_HMR_PARTICIPANTS,
  NativeScriptHmrParticipant,
  requestNativeScriptAppRestart,
} from '@nativescript/angular';
import { Store } from '@ngrx/store';

export function provideStoreHmr() {
  return makeEnvironmentProviders([
    {
      provide: NATIVESCRIPT_HMR_PARTICIPANTS,
      multi: true,
      useFactory: (): NativeScriptHmrParticipant => {
        const store = inject(Store);
        return {
          key: 'app/store',
          version: 1,
          save: () => {
            let state: unknown;
            store.subscribe((s) => (state = s)).unsubscribe();
            return state;
          },
          restore: (state) => {
            if (!state || typeof state !== 'object') {
              requestNativeScriptAppRestart('store snapshot unusable');
              return;
            }
            store.dispatch({ type: '[HMR] restore', state });
          },
        };
      },
    },
  ]);
}
```

`restore` runs inside the Angular zone, after the new app is stable, in the order the participants were provided. It may return a promise, which is awaited.

## Cleaning up root listeners

A module that re-runs gets a new instance, but Vite only disposes the boundary (the entry). Anything the old instance registered on long-lived objects (`Application.on`, a global event bus, `setInterval`) stays registered, unless the module removes it. `nativescript:beforeRerun` goes to exactly the modules about to re-run, before any `dispose`:

```ts
import { Application } from '@nativescript/core';

const onResume = () => refresh();
Application.on(Application.resumeEvent, onResume);
import.meta.hot?.on('nativescript:beforeRerun', () => Application.off(Application.resumeEvent, onResume));
```

From a module that registers listeners on behalf of others, use the payload helpers. They accept `import.meta.url`, a Vite URL or an absolute path:

```ts
import.meta.hot?.on('nativescript:beforeReboot', (e) => {
  if (e.isRerun(import.meta.url)) disposeEverything();
  if (e.isChanged('/src/app/theme.ts')) reloadTheme();
});
```

To keep a value for the next instance of the same module, use `import.meta.hot.data`:

```ts
const cache: Map<string, Item> = import.meta.hot?.data.cache ?? new Map();
if (import.meta.hot) import.meta.hot.data.cache = cache;
```

`hot.data` survives only a hot update of the same module, and only modules that re-run see it. For state shared across the app, use `HmrCacheService` or a participant.

## Known gaps versus `feat/vite-hmr`

- **Back stack.** Only the current URL is restored, not the `page-router-outlet` back stack: after a reboot on `/details/1`, back has nothing to return to. Replaying the stack needs the per-outlet history that only `NSLocationStrategy` holds; it is future work.
- **Edited dialog classes without `dialogComponents`.** Nothing registers component classes automatically any more. A dialog whose own class changed reopens with its old code unless its class is listed in `dialogComponents` (or registered through the shim). Matching is by class name.
- **Dialog close animation.** The old app's dialogs close with their normal animation during teardown; the old branch suppressed it through a private core field.
- **Not ported (outside this layer's scope):**
  - the modal host wrapper that let in-place template HMR swap a modal's root view;
  - the renderer's re-application of changed component styles after `ɵɵreplaceMetadata`;
  - the `__NS_NG_ELEMENT_MAP__` shared element registry, which isn't needed because `@nativescript/angular` is evaluated once per process.
- **`__NS_HOT_REGISTRY__` listeners** are never pruned, and don't receive `nativescript:beforeRerun` (see above).
- **`__NS_HOT_REGISTRY__` members.** The shim has only `on`, `off` and `dispatchHotEvent`. The old registry's other members (`createHotContext`, `runDispose`, `requestFullReload`, `listHotEventListeners`, …) are gone: the server injected the calls to them, and nothing in the new client needs them.
- **`registerHmrHooks`** has no shim: it was internal. Its `afterBootstrap` ran right after bootstrap. A participant's `restore` runs after the app is stable.
- **`isHmrActive()`** (internal) maps to `import.meta.hot`, or `HmrCacheService.isHmr`.
- **Module-level providers.** When the provider list isn't re-evaluated on reboot, the old URL is reached by a navigation after boot instead of `START_PATH` (see route restore above).
- **After a failed reboot** (the entry threw, then you fixed it), the next reboot boots at the saved URL, but no participant restores: `feat/web-style-hmr` only restores into a bootstrap that follows `prepareHmrReboot()`, and the failed import left no app to tear down. The snapshots are kept, and the reboot after that saves fresh ones.
