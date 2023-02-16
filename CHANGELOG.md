## [15.0.2](https://github.com/NativeScript/angular/compare/15.0.1...15.0.2) (2023-02-16)


### Bug Fixes

* add meta for TextBase and FormattedString ([#104](https://github.com/NativeScript/angular/issues/104)) ([8413e8e](https://github.com/NativeScript/angular/commit/8413e8e049d2bea3bf5a7833ea044663c0065eea))


### Features

* support embedded applications ([#107](https://github.com/NativeScript/angular/issues/107)) ([08df232](https://github.com/NativeScript/angular/commit/08df232f0cb07f4567c415b4d50de9bdeb19ca89))



## [15.0.1](https://github.com/NativeScript/angular/compare/15.0.0...15.0.1) (2022-12-14)


### Bug Fixes

* use inject in ListViewComponent ([#102](https://github.com/NativeScript/angular/issues/102)) ([9fdb0d2](https://github.com/NativeScript/angular/commit/9fdb0d277a3cd0b1c025ebbe109a5cb936ea8425))



## [15.0.0](https://github.com/NativeScript/angular/compare/14.2.7...15.0.0) (2022-11-30)

### Features

* Angular 15 support ([#97](https://github.com/NativeScript/angular/issues/97)) ([51ad39e](https://github.com/NativeScript/angular/commit/51ad39e6c52f99d9e1249efeecc2e61d339cd061))
  

## [14.2.7](https://github.com/NativeScript/angular/compare/14.2.6...14.2.7) (2022-11-30)


### Bug Fixes

* **router:** fix navigation when clearing history and navigating before the navigatedTo event fires ([#100](https://github.com/NativeScript/angular/issues/100)) ([f276f56](https://github.com/NativeScript/angular/commit/f276f5690a9e6dd99fb2a613343fd7f07f8bab33))



## [14.2.6](https://github.com/NativeScript/angular/compare/14.2.5...14.2.6) (2022-11-23)


### Bug Fixes

* read navigation extras from the router navigation instead of using stored values ([#88](https://github.com/NativeScript/angular/issues/88)) ([2e475f9](https://github.com/NativeScript/angular/commit/2e475f95f31d023c1d49f870e7c1d1290341840a))
* use changeDetectorRef.detectChanges() instead of detectChanges() private api ([#99](https://github.com/NativeScript/angular/issues/99)) ([4e33561](https://github.com/NativeScript/angular/commit/4e335613e6fd23ed541a89691c0842975ab789c1))
* use correct EnvironmentalInjector in page-router-outlet ([#94](https://github.com/NativeScript/angular/issues/94)) ([6623002](https://github.com/NativeScript/angular/commit/66230021603140cb352a335057687b1bd49438f6))



## [14.2.5](https://github.com/NativeScript/angular/compare/14.2.4...14.2.5) (2022-10-04)


### Bug Fixes

* remove child from previous parent if needed due to animations ([#93](https://github.com/NativeScript/angular/issues/93)) ([5040000](https://github.com/NativeScript/angular/commit/50400006f4d071b3752416351072db25a8c8a3af))



## [14.2.4](https://github.com/NativeScript/angular/compare/14.2.3...14.2.4) (2022-09-22)


### Bug Fixes

* **animations:** no known animation properties specified ([#91](https://github.com/NativeScript/angular/issues/91)) ([3c80919](https://github.com/NativeScript/angular/commit/3c80919a2083ae2c085cd7356f4c88f9b943657c))



## [14.2.3](https://github.com/NativeScript/angular/compare/14.2.2...14.2.3) (2022-09-13)


### Bug Fixes

* correctly reassign siblings in linked list ([#89](https://github.com/NativeScript/angular/issues/89)) ([a7527c9](https://github.com/NativeScript/angular/commit/a7527c99f392faadf6d84a42823eb798de3c151a))
* modal beforeClosed and afterClosed consistency between platforms ([#87](https://github.com/NativeScript/angular/issues/87)) ([ad3e47c](https://github.com/NativeScript/angular/commit/ad3e47c40af5f07aae6fc1fccf6f8ce49d457384))



## [14.2.2](https://github.com/NativeScript/angular/compare/14.2.1...14.2.2) (2022-09-10)


### Bug Fixes

* better handling of parentNode on detached elements ([#86](https://github.com/NativeScript/angular/issues/86)) ([8777f57](https://github.com/NativeScript/angular/commit/8777f5713ceb1c39c817b4c8e846817a1128161d))



## [14.2.1](https://github.com/NativeScript/angular/compare/14.2.0...14.2.1) (2022-09-08)


### Bug Fixes

* listview node handling ([455d21d](https://github.com/NativeScript/angular/commit/455d21db486d73613e79e5cc78cd172144491cfb))



# [14.2.0](https://github.com/NativeScript/angular/compare/14.0.4...14.2.0) (2022-08-27)


### Bug Fixes

* patch showModal call in zone ([#83](https://github.com/NativeScript/angular/issues/83)) ([7b8389e](https://github.com/NativeScript/angular/commit/7b8389e69096313a899af316dc7e9349be139db4))


### Features

* Angular 14.2.0 ([#84](https://github.com/NativeScript/angular/issues/84)) ([5a976a2](https://github.com/NativeScript/angular/commit/5a976a29c966bfde94af5297e97003cfb860dc3e))
* support adding TextNode elements (automatically sets text property by default) ([#80](https://github.com/NativeScript/angular/issues/80)) ([1be9c3a](https://github.com/NativeScript/angular/commit/1be9c3a441023f4fa7cc0fce1e9bdcf3e0fd8aa4))



## [14.0.4](https://github.com/NativeScript/angular/compare/14.0.3...14.0.4) (2022-08-05)


### Bug Fixes

* router outlet back navigation resilience ([#79](https://github.com/NativeScript/angular/issues/79)) ([bebcde2](https://github.com/NativeScript/angular/commit/bebcde23c4d6a392638c23ec1e2bc63b06a9b43e))



## [14.0.3](https://github.com/NativeScript/angular/compare/14.0.1...14.0.3) (2022-07-02)


### Bug Fixes

* load pages in location instead of in appRef ([#74](https://github.com/NativeScript/angular/issues/74)) ([33d4dc6](https://github.com/NativeScript/angular/commit/33d4dc6f836b40128b9abb12307f3b7f822c6c75))
* remove deep import of @nativescript/core ([0aacde2](https://github.com/NativeScript/angular/commit/0aacde244b1a8ba759d0adc10267218de8cc73b5))



## [14.0.1](https://github.com/NativeScript/angular/compare/14.0.0...14.0.1) (2022-06-23)


### Bug Fixes

* handle standalone component routing with loadComponent ([#73](https://github.com/NativeScript/angular/issues/73)) ([4a5ea46](https://github.com/NativeScript/angular/commit/4a5ea4675c5cb576add6ea0afc96c4b11e395d88))



# [14.0.0](https://github.com/NativeScript/angular/compare/13.0.4...14.0.0) (2022-06-15)


### Features

* Angular 14 ([#72](https://github.com/NativeScript/angular/issues/72)) ([af32ad7](https://github.com/NativeScript/angular/commit/af32ad7dd8a0eedb1702917e8207fcb55230b900))



## [13.0.4](https://github.com/NativeScript/angular/compare/13.0.3...13.0.4) (2022-05-31)


### Bug Fixes

* correctly zone patch FileReader ([#67](https://github.com/NativeScript/angular/issues/67)) ([ff71723](https://github.com/NativeScript/angular/commit/ff71723a5e21cc279bc9c65f0b8d4dbdd24e6176))
* resolve routing component cleanup, preserve query params and replaceUrl ([#69](https://github.com/NativeScript/angular/issues/69)) ([69f94bf](https://github.com/NativeScript/angular/commit/69f94bfb49eef5f079bb81d43a54e7247003845b))
* support css variables in dynamic style ([#68](https://github.com/NativeScript/angular/issues/68)) ([8fa3c1d](https://github.com/NativeScript/angular/commit/8fa3c1deb464ebbad18b176984dec087f16c4e7f))



## [13.0.3](https://github.com/NativeScript/angular/compare/13.0.2...13.0.3) (2022-02-28)


### Bug Fixes

* look for correct outlet to back to ([#58](https://github.com/NativeScript/angular/issues/58)) ([b782e36](https://github.com/NativeScript/angular/commit/b782e36236ee11aead05a97462801021b81276ea))
* nested modal should work under new api ([#59](https://github.com/NativeScript/angular/issues/59)) ([74cc41f](https://github.com/NativeScript/angular/commit/74cc41fffc3a927942edb5c9c077fc2be9df4182))



## [13.0.2](https://github.com/NativeScript/angular/compare/13.0.1...13.0.2) (2022-02-12)


### Bug Fixes

* restrict nested outlet back navigation scope ([#54](https://github.com/NativeScript/angular/issues/54)) ([5a88bc2](https://github.com/NativeScript/angular/commit/5a88bc2392e66c2afb9eb72d728ded1912d01b98))
* **zone:** main thread promise handling issue ([44cf00e](https://github.com/NativeScript/angular/commit/44cf00eb044ebfc4852b15534b8ea2ad69610d02))


### Features

* **modals:** closed$ and ability to access ModalDialogParams outside of component context ([a18bd18](https://github.com/NativeScript/angular/commit/a18bd187752bc0715bd95da16636ca272d7b04cb))
* use compilationMode 'full' ([a4972cc](https://github.com/NativeScript/angular/commit/a4972cc759e3a0b4fdc94582d27060b4bcb32de8))



## [13.0.1](https://github.com/NativeScript/angular/compare/13.0.0...13.0.1) (2022-01-17)


### Bug Fixes

* use new import.meta.webpackHmr to account for esm ([#51](https://github.com/NativeScript/angular/issues/51)) ([cd934e1](https://github.com/NativeScript/angular/commit/cd934e1adefe48dc0631c621c5f0fec5c2b85bc1))



# [13.0.0](https://github.com/NativeScript/angular/compare/12.2.0...13.0.0) (2021-12-22)


### Features

* Angular 13 ([#42](https://github.com/NativeScript/angular/issues/42)) ([f80842e](https://github.com/NativeScript/angular/commit/f80842eb0740ed5eb4ff0ef97cab36b98eb365d9))



# [12.2.0](https://github.com/NativeScript/angular/compare/12.0.6...12.2.0) (2021-09-09)


### Bug Fixes

* force trigger CD on navigation ([#27](https://github.com/NativeScript/angular/issues/27)) ([343e139](https://github.com/NativeScript/angular/commit/343e139e845ecb28c407c6f2e29aed820ed60f3c))
* guard around empty cache ([#34](https://github.com/NativeScript/angular/issues/34)) ([ea8ba37](https://github.com/NativeScript/angular/commit/ea8ba37b08bf4e86d23f593a32e3646527a2fbca))
* **list-view:** try to unwrap component views ([#33](https://github.com/NativeScript/angular/issues/33)) ([81d7ffb](https://github.com/NativeScript/angular/commit/81d7ffb15c170943f39a8c33071822df80896f76))
* listview template height handling with detectChanges ([60eeb72](https://github.com/NativeScript/angular/commit/60eeb72d7a9fa241f1a9d9a22a66f59870bb1f3d))


### Features

* provide custom optimized NgZone ([#26](https://github.com/NativeScript/angular/issues/26)) ([b99210c](https://github.com/NativeScript/angular/commit/b99210ce753344a25a666d3499ac4c82bcb728ae))
* provide TEMPLATED_ITEMS_COMPONENT ([#32](https://github.com/NativeScript/angular/issues/32)) ([303b642](https://github.com/NativeScript/angular/commit/303b64281d19d8d6781ca17d873b82efa609f1dc))
* **zone.js:** patch Utils threading functions ([#31](https://github.com/NativeScript/angular/issues/31)) ([13b2ea8](https://github.com/NativeScript/angular/commit/13b2ea835a199b4f69c192e134cbf9056b1caaf6))



## [12.0.6](https://github.com/NativeScript/angular/compare/12.0.5...12.0.6) (2021-07-21)


### Bug Fixes

* **dialogs:** modal handling ([#18](https://github.com/NativeScript/angular/issues/18)) ([5bfafd1](https://github.com/NativeScript/angular/commit/5bfafd1815e080439929bc5a144efa25cab222c9))
* **list-view:** always set a default template ([#16](https://github.com/NativeScript/angular/issues/16)) ([44d0d88](https://github.com/NativeScript/angular/commit/44d0d883a6fa4536faa96152e61eddf3f5587a0b))
* **zone.js:** correctly patch es6 classes ([#15](https://github.com/NativeScript/angular/issues/15)) ([2dca0ce](https://github.com/NativeScript/angular/commit/2dca0ce150bbd7a797cdfc81656b67e7b65351ee))



## [12.0.5](https://github.com/NativeScript/angular/compare/12.0.4...12.0.5) (2021-07-01)


### Bug Fixes

* platform filter directives ([#11](https://github.com/NativeScript/angular/issues/11)) ([b3d93b4](https://github.com/NativeScript/angular/commit/b3d93b4ded6a5885bc53a3bc58b5bd1ecccd37cb))



## [12.0.4](https://github.com/NativeScript/angular/compare/12.0.2...12.0.4) (2021-06-28)


### Bug Fixes

* **list-view:** ensure templates are in a consistent state on itemLoa… ([#10](https://github.com/NativeScript/angular/issues/10)) ([1c842f8](https://github.com/NativeScript/angular/commit/1c842f880beaa21eaf6bfd77b0d5246a83cfc136))



## [12.0.2](https://github.com/NativeScript/angular/compare/12.0.1...12.0.2) (2021-06-17)


### Bug Fixes

* export AppHostView ([601b080](https://github.com/NativeScript/angular/commit/601b080de38eff91b5e40aed44fbb9782d08c05a))



## [12.0.1](https://github.com/NativeScript/angular/compare/12.0.0...12.0.1) (2021-06-10)


### Bug Fixes

* backport tab-view ([#5](https://github.com/NativeScript/angular/issues/5)) ([8e121dd](https://github.com/NativeScript/angular/commit/8e121dd1faeccf3b820420c5a1c32f35296c48c0))



# 12.0.0 (2021-06-08)

* Angular 12 compatibility with a new revamped engine.



