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



