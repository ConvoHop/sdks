# Changelog

## 0.1.0 (2026-10-09)


### ⚠ BREAKING CHANGES

* **client:** `MediaConnection.admissionId` is removed and the Web client no longer sends the `convohop.admission` WebSocket prelude; the media server must accept the grant's `connectToken`. `reportRead()` and `receipts()` return validated `ReadReceipt`s, and `messages()` refuses items from another conversation and a `limit` outside 1..100. LiveKit reconnects automatically (`onResuming`/`onResumed`). Request inputs and recovery state must be canonical JSON. `watch()` needs `platform.WebSocket` or a global WebSocket. `OperationCatalogEntry` gains a required `idempotency`. A redirected authority response fails with `TRANSPORT_UNKNOWN`. `origin()`, `fingerprint()` and the transport refuse a non-WHATWG `URL` unless `platform.URL` is passed.

### Features

* add LiveKit connectToken to live connection grants ([#7](https://github.com/ConvoHop/sdks/issues/7)) ([33cfbc1](https://github.com/ConvoHop/sdks/commit/33cfbc14695f1e582ad35e6d61df9ff1cf5fdd46))
* **client:** add `@convohop/client/push` for Web Push subscriptions and service worker notifications ([837c898](https://github.com/ConvoHop/sdks/commit/837c898c632d052540cfe2471006cfb87866fbd3))
* **client:** add a conversation store, an offline outbox, typing indicators and session refresh scheduling ([837c898](https://github.com/ConvoHop/sdks/commit/837c898c632d052540cfe2471006cfb87866fbd3))
* **client:** connect Web calls with the grant's single-use connectToken ([837c898](https://github.com/ConvoHop/sdks/commit/837c898c632d052540cfe2471006cfb87866fbd3))
* **client:** let callers await Outbox.close() ([#41](https://github.com/ConvoHop/sdks/issues/41)) ([466591e](https://github.com/ConvoHop/sdks/commit/466591ee7b904c5036ea63d3f45421f021c7f2bb))
* **client:** let FCM push registrations carry a Firebase Installation ID ([#39](https://github.com/ConvoHop/sdks/issues/39)) ([d9c9946](https://github.com/ConvoHop/sdks/commit/d9c9946b55512d549ef76a8df9d6d4f206d569f7))
* **client:** let runtimes inject platform services, async recovery storage and native LiveKit connectors ([837c898](https://github.com/ConvoHop/sdks/commit/837c898c632d052540cfe2471006cfb87866fbd3))
* finalize push notification events and add conversation mute ([#22](https://github.com/ConvoHop/sdks/issues/22)) ([0632d42](https://github.com/ConvoHop/sdks/commit/0632d4210bfd66cafb1dca57623d3f659ed3638e))
* **react-native:** iOS modules and example ([#74](https://github.com/ConvoHop/sdks/issues/74)) ([cda4be2](https://github.com/ConvoHop/sdks/commit/cda4be2bdeca696f5a4e1bbaa354ab8a3f0b7cee))
* **schema:** add agent signup, agent keys, spend controls and credits ([#72](https://github.com/ConvoHop/sdks/issues/72)) ([2ad4dd1](https://github.com/ConvoHop/sdks/commit/2ad4dd1c2eca156c28dd6411dc5653d7d795ea5f))
* **server:** typed backend data plane and webhook verification ([#20](https://github.com/ConvoHop/sdks/issues/20)) ([9fb6c87](https://github.com/ConvoHop/sdks/commit/9fb6c87d16ec044e40a32e9bf8b78f0f7b2b8ab5))


### Bug Fixes

* **client:** continue managed replay in paced bounded rounds ([#14](https://github.com/ConvoHop/sdks/issues/14)) ([f1e4b93](https://github.com/ConvoHop/sdks/commit/f1e4b93c3b7f95c15ecb4975e78ae449ec33abef))
* **client:** match relative notification click URLs and keep each tab's unsent messages ([#37](https://github.com/ConvoHop/sdks/issues/37)) ([e508e38](https://github.com/ConvoHop/sdks/commit/e508e3882eedf5a02acf1fe4806534eed51490dc))
* **client:** note an outbox attempt only after the transport saves its request ([#40](https://github.com/ConvoHop/sdks/issues/40)) ([8d20531](https://github.com/ConvoHop/sdks/commit/8d205315a8e6f06e49d0754cf3fcc700bc2634a3))
* **core:** evict final recovery records and share one retry classifier ([#60](https://github.com/ConvoHop/sdks/issues/60)) ([63257a6](https://github.com/ConvoHop/sdks/commit/63257a604fdfeb1d1863d5cc3ac72303f76746e8))
* **core:** merge the shared recovery journal per request instead of overwriting it ([#53](https://github.com/ConvoHop/sdks/issues/53)) ([19af944](https://github.com/ConvoHop/sdks/commit/19af944ad3d75febd377d31480aff0637f28abf5))
* **recovery:** treat spent retry budgets as final and retain live handles' records ([#67](https://github.com/ConvoHop/sdks/issues/67)) ([1aa28fb](https://github.com/ConvoHop/sdks/commit/1aa28fbe93238f7e89a8449752ad999248eaea14))


### Miscellaneous Chores

* release 0.1.0 ([5b1554a](https://github.com/ConvoHop/sdks/commit/5b1554a23712dd249ceca0a1cc35e52a5ee674de))
