# Changelog

## 0.1.0 (2026-10-09)


### Features

* add backend data-plane scopes and actAsPrincipalId inputs ([#10](https://github.com/ConvoHop/sdks/issues/10)) ([e1d2d8d](https://github.com/ConvoHop/sdks/commit/e1d2d8d83a23fe2703808ccfd677b09da3d98794))
* add project and organization usage queries ([#13](https://github.com/ConvoHop/sdks/issues/13)) ([b8fd430](https://github.com/ConvoHop/sdks/commit/b8fd4300a7f4b997f24c47bf92d9b1eefa482589))
* finalize push notification events and add conversation mute ([#22](https://github.com/ConvoHop/sdks/issues/22)) ([0632d42](https://github.com/ConvoHop/sdks/commit/0632d4210bfd66cafb1dca57623d3f659ed3638e))
* **server:** push payload builders and contract ([#21](https://github.com/ConvoHop/sdks/issues/21)) ([0d43493](https://github.com/ConvoHop/sdks/commit/0d4349392906f314486cb185f8c56cbe92131f18))
* **server:** typed backend data plane and webhook verification ([#20](https://github.com/ConvoHop/sdks/issues/20)) ([9fb6c87](https://github.com/ConvoHop/sdks/commit/9fb6c87d16ec044e40a32e9bf8b78f0f7b2b8ab5))


### Bug Fixes

* **core:** evict final recovery records and share one retry classifier ([#60](https://github.com/ConvoHop/sdks/issues/60)) ([63257a6](https://github.com/ConvoHop/sdks/commit/63257a604fdfeb1d1863d5cc3ac72303f76746e8))
* **core:** merge the shared recovery journal per request instead of overwriting it ([#53](https://github.com/ConvoHop/sdks/issues/53)) ([19af944](https://github.com/ConvoHop/sdks/commit/19af944ad3d75febd377d31480aff0637f28abf5))
* **recovery:** treat spent retry budgets as final and retain live handles' records ([#67](https://github.com/ConvoHop/sdks/issues/67)) ([1aa28fb](https://github.com/ConvoHop/sdks/commit/1aa28fbe93238f7e89a8449752ad999248eaea14))


### Miscellaneous Chores

* release 0.1.0 ([5b1554a](https://github.com/ConvoHop/sdks/commit/5b1554a23712dd249ceca0a1cc35e52a5ee674de))
