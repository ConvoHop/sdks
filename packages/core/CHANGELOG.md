# Changelog

## 0.1.0 (2026-10-09)


### ⚠ BREAKING CHANGES

* **client:** `MediaConnection.admissionId` is removed and the Web client no longer sends the `convohop.admission` WebSocket prelude; the media server must accept the grant's `connectToken`. `reportRead()` and `receipts()` return validated `ReadReceipt`s, and `messages()` refuses items from another conversation and a `limit` outside 1..100. LiveKit reconnects automatically (`onResuming`/`onResumed`). Request inputs and recovery state must be canonical JSON. `watch()` needs `platform.WebSocket` or a global WebSocket. `OperationCatalogEntry` gains a required `idempotency`. A redirected authority response fails with `TRANSPORT_UNKNOWN`. `origin()`, `fingerprint()` and the transport refuse a non-WHATWG `URL` unless `platform.URL` is passed.

### Features

* add backend data-plane scopes and actAsPrincipalId inputs ([#10](https://github.com/ConvoHop/sdks/issues/10)) ([e1d2d8d](https://github.com/ConvoHop/sdks/commit/e1d2d8d83a23fe2703808ccfd677b09da3d98794))
* add LiveKit connectToken to live connection grants ([#7](https://github.com/ConvoHop/sdks/issues/7)) ([33cfbc1](https://github.com/ConvoHop/sdks/commit/33cfbc14695f1e582ad35e6d61df9ff1cf5fdd46))
* add project and organization usage queries ([#13](https://github.com/ConvoHop/sdks/issues/13)) ([b8fd430](https://github.com/ConvoHop/sdks/commit/b8fd4300a7f4b997f24c47bf92d9b1eefa482589))
* add rate-limit and quota problem types to the schema ([#9](https://github.com/ConvoHop/sdks/issues/9)) ([9822dd6](https://github.com/ConvoHop/sdks/commit/9822dd65ad5a7f83825f493e87029a3bc98b6335))
* **client:** add `@convohop/client/push` for Web Push subscriptions and service worker notifications ([837c898](https://github.com/ConvoHop/sdks/commit/837c898c632d052540cfe2471006cfb87866fbd3))
* **client:** add a conversation store, an offline outbox, typing indicators and session refresh scheduling ([837c898](https://github.com/ConvoHop/sdks/commit/837c898c632d052540cfe2471006cfb87866fbd3))
* **client:** connect Web calls with the grant's single-use connectToken ([837c898](https://github.com/ConvoHop/sdks/commit/837c898c632d052540cfe2471006cfb87866fbd3))
* **client:** let runtimes inject platform services, async recovery storage and native LiveKit connectors ([837c898](https://github.com/ConvoHop/sdks/commit/837c898c632d052540cfe2471006cfb87866fbd3))
* finalize push notification events and add conversation mute ([#22](https://github.com/ConvoHop/sdks/issues/22)) ([0632d42](https://github.com/ConvoHop/sdks/commit/0632d4210bfd66cafb1dca57623d3f659ed3638e))
* **schema:** add agent signup, agent keys, spend controls and credits ([#72](https://github.com/ConvoHop/sdks/issues/72)) ([2ad4dd1](https://github.com/ConvoHop/sdks/commit/2ad4dd1c2eca156c28dd6411dc5653d7d795ea5f))
* **schema:** add organization billing and hosted billing link operations ([#56](https://github.com/ConvoHop/sdks/issues/56)) ([d11bae6](https://github.com/ConvoHop/sdks/commit/d11bae63e3496f1b17e5041e3d45424cdc9a5c7c))
* **schema:** webhook endpoint management, rotation and replay ([#15](https://github.com/ConvoHop/sdks/issues/15)) ([d0a630e](https://github.com/ConvoHop/sdks/commit/d0a630e23fcc9109b1a45d071afda116f5e91dd4))
* **sdkgen:** annotations, language-neutral IR and emitters ([#11](https://github.com/ConvoHop/sdks/issues/11)) ([a6da012](https://github.com/ConvoHop/sdks/commit/a6da012680c6a062dbb2db92919d4ac4a92f0739))
* **server:** typed backend data plane and webhook verification ([#20](https://github.com/ConvoHop/sdks/issues/20)) ([9fb6c87](https://github.com/ConvoHop/sdks/commit/9fb6c87d16ec044e40a32e9bf8b78f0f7b2b8ab5))


### Bug Fixes

* **client:** note an outbox attempt only after the transport saves its request ([#40](https://github.com/ConvoHop/sdks/issues/40)) ([8d20531](https://github.com/ConvoHop/sdks/commit/8d205315a8e6f06e49d0754cf3fcc700bc2634a3))
* **core:** evict final recovery records and share one retry classifier ([#60](https://github.com/ConvoHop/sdks/issues/60)) ([63257a6](https://github.com/ConvoHop/sdks/commit/63257a604fdfeb1d1863d5cc3ac72303f76746e8))
* **core:** merge the shared recovery journal per request instead of overwriting it ([#53](https://github.com/ConvoHop/sdks/issues/53)) ([19af944](https://github.com/ConvoHop/sdks/commit/19af944ad3d75febd377d31480aff0637f28abf5))
* **recovery:** treat spent retry budgets as final and retain live handles' records ([#67](https://github.com/ConvoHop/sdks/issues/67)) ([1aa28fb](https://github.com/ConvoHop/sdks/commit/1aa28fbe93238f7e89a8449752ad999248eaea14))


### Miscellaneous Chores

* release 0.1.0 ([5b1554a](https://github.com/ConvoHop/sdks/commit/5b1554a23712dd249ceca0a1cc35e52a5ee674de))
