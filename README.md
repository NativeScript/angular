# NativeScript Angular

Monorepo for [Angular](https://angular.dev) integration with [NativeScript](https://nativescript.org), enabling you to build native iOS, Android and visionOS apps with Angular.

## Packages

| Package | Version | Description |
| --- | --- | --- |
| [`@nativescript/angular`](packages/angular) | [![npm](https://img.shields.io/npm/v/%40nativescript%2Fangular.svg)](https://www.npmjs.com/package/@nativescript/angular) | The Angular integration for NativeScript: renderer, router integration, dialogs, list view templates, zone setup and application bootstrap. |
| [`@nativescript/zone-js`](packages/zone-js) | [![npm](https://img.shields.io/npm/v/%40nativescript%2Fzone-js.svg)](https://www.npmjs.com/package/@nativescript/zone-js) | NativeScript-specific patches for [zone.js](https://www.npmjs.com/package/zone.js) so Angular change detection works with native APIs. |

The workspace also contains [`apps/nativescript-demo-ng`](apps/nativescript-demo-ng), a demo app used to develop and test the packages.

See [DevelopmentWorkflow.md](DevelopmentWorkflow.md) for more details on contributing.

## Development

Clean and setup workspace:

```
npm run clean.all
```

Build packages:

```
npm run build
```

Run demo:

```
npm run demo.ios
// or...
npm run demo.android
```

Clean/Reset demo dependencies:

```
npm run demo.clean
```

Unit tests for iOS and Android:

```
npm run test.android
npm run test.ios
```

## Releasing

Releases are managed with [Nx Release](https://nx.dev/features/manage-releases). Each package is released independently:

```
npm run release.angular
npm run release.zone-js
```

This will build the package, prompt for the new version (or accept it as an argument, e.g. `npm run release.angular -- 22.0.0`), update the package's changelog ([packages/angular/CHANGELOG.md](packages/angular/CHANGELOG.md) or [packages/zone-js/CHANGELOG.md](packages/zone-js/CHANGELOG.md)), commit as `release: <version>`, tag as `<package>@<version>` (e.g. `angular@22.0.0`, `zone-js@4.0.1`), push, create the GitHub release and publish to npm from `dist/packages/*`.

Useful flags (pass after `--`):

- `--dry-run` — preview everything without changing anything
- `--skip-publish` — do everything except publish to npm

A `GITHUB_TOKEN` environment variable (e.g. `GITHUB_TOKEN=$(gh auth token)`) is required to create the GitHub release non-interactively.
