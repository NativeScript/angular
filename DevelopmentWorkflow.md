# Development Workflow

<!-- TOC depthFrom:2 -->

- [Development Workflow](#development-workflow)
  - [Running locally](#running-locally)
    - [Prerequisites](#prerequisites)
    - [Clone repository](#clone-repository)
    - [Install dependencies](#install-dependencies)
    - [Run some of the e2e applications e.g. router-tab-view](#run-some-of-the-e2e-applications-eg-router-tab-view)
  - [Running the tests](#running-the-tests)
  - [Testing locally by running e2e tests](#testing-locally-by-running-e2e-tests)
  - [Building Packages](#building-packages)

<!-- /TOC -->

## Running locally

### Prerequisites

Install your native toolchain and NativeScript as described in the docs:

https://docs.nativescript.org/environment-setup.html

### Clone repository

```
$ git clone git@github.com:NativeScript/angular.git
$ cd angular
```

### Install dependencies

```
$ cd angular
$ npm clean.all
```

### Run some of the e2e applications e.g. router-tab-view

**E2E TESTS STILL NOT IN THIS REPO!** instead use `apps/nativescript-demo-ng`

Install NPM packages (use the local copy of `@nativescript/angular`):
```
$ cd e2e/router-tab-view
$ npm install
```

Start the app:

```
$ tns run android
$ tns run ios
```

Make changes to `@nativescript/angular` and see them applied in the running app.

## Running the tests

Install the NPM dependencies:
```
$ cd apps/nativescript-demo-ng
$ npm install
```

Run the tests:

```
$ ns test ios
$ ns test android
```

## Testing locally by running e2e tests

**E2E TESTS STILL NOT IN THIS REPO!**

NOTE: The steps below describe how to run `renderer` tests, but the same approach can be used to run `router` or any other `e2e` tests.

1. Navigate to `e2e/renderer`
    ``` bash
    cd e2e/renderer
    ```

2. Install dependencies. This also installs your local copy of the nativescript-angular plugin.
    ``` bash
    npm install
    ```
3. Make sure to have an emulator set up or connect a physical Android/iOS device.

4. Build the app for Android or iOS
    ```bash
    tns run android/ios
    ```

5. Install [appium](http://appium.io/) globally.
    ``` bash
    npm install -g appium
    ```

6. Follow the instructions in the [nativescript-dev-appium](https://github.com/nativescript/nativescript-dev-appium#custom-appium-capabilities) plugin to add an appium capability for your device inside `./e2e/renderer/e2e/config/appium.capabilities.json`.

7. Run the automated tests. The value of the `runType` argument should match the name of the capability that you just added.
    ``` bash
    npm run e2e -- --runType capabilityName
    ```
    
## Building Packages

1. Build `@nativescript/angular`:
    ```
    npx nx run angular:build
    ```
2. Build `@nativescript/zone-js`
    ```
    npx nx run zone-js:build
    ```
Packages are available in the `dist` folder.