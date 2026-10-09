# .NET push notifications quickstart

Send push notifications for ConvoHop messages and calls: `PushPayloads` turns notification events into APNs, FCM and Web Push requests, and you send them with your own push credentials and libraries.

## Before you start

ConvoHop doesn't send push notifications itself. You need:

- A webhook endpoint that receives `notification.message`, `notification.call` and `notification.callCancelled` events, as the [webhooks quickstart](webhooks.md) shows. Each of these events is addressed to one recipient. Events arrive at least once and in any order, so deduplicate on `EventId` before you send.
- The devices that your app registered for each user, in your own database.
- Your push credentials and clients. This page uses `FirebaseAdmin` for FCM and `Lib.Net.Http.WebPush` for browsers. For APNs, use any HTTP/2 client.

The samples use these namespaces:

```cs include=examples/src/Push.cs#usings
```

## Build and send the requests

```cs include=examples/src/Push.cs#notify
```

Each builder returns `null` when the event doesn't apply to the platform or has expired, and then you send nothing. The builders take a `PushOptions`. The APNs builders take an `ApnsPushOptions`, which derives from it, so one `ApnsPushOptions` serves every builder:

- `BundleId` is your iOS app's bundle ID. The APNs builders need it for the `apns-topic` header, and the others ignore it.
- `Title` and `Body` are visible text of your own, such as the sender's name. Without them, a request carries only the event's metadata, plus the start of the message when the project turns on message previews. Set `Preview` to `false` to leave the preview out.
- `Now` replaces the clock, for example in tests.

A request expires when its event stops being relevant: a day after a message or a missed call, and when the ring stops for a call. A call and its cancellation share a collapse key, so a push service that still holds the call's request replaces it with the cancellation's.

The requests use each service's wire format: APNs headers and a payload, an FCM HTTP v1 message, and Web Push headers and a payload. Each `PayloadJson` is the compact JSON that the size limits are measured on, so send it as it is, encoded as UTF-8. `Lib.Net.Http.WebPush` and `FirebaseAdmin` take some of these values in their own form, as the next two sections show.

## Web Push: set the message's TTL, Urgency and Topic

Every Web Push request has a `TTL` header. Requests for calls and cancellations also have the `Urgency: high` header, so the push service and the device don't hold them back to save battery, and a `Topic` header, their collapse key. Message requests have `Urgency: normal`.

`Lib.Net.Http.WebPush` doesn't take headers. It sets `TTL`, `Urgency` and `Topic` from the `PushMessage`'s `TimeToLive`, `Urgency` and `Topic` properties, and leaves out `Urgency: normal`, the default. Without `TimeToLive`, it sends a TTL of four weeks, so a message would outlive its event. Copy the request's `TtlSeconds`, `Urgency` and `Topic` to the message:

```cs include=examples/src/Push.cs#web-push
```

One `PushServiceClient` serves every subscription: it signs each VAPID token for the origin of the subscription's push service.

## FCM: FirebaseAdmin takes a TimeSpan and a Priority enum

`MessageJson` is an FCM HTTP v1 message without a target, in the REST form, where `ttl` is a string of seconds such as `"45s"` and `priority` is uppercase, such as `"HIGH"`. To send it through the FCM REST API, add `token` or `fid`.

`FirebaseAdmin` takes the request's `Data` and its Android options in its own form: `TimeToLive` is a `TimeSpan` and `Priority` is an enum. Convert the options:

```cs include=examples/src/Push.cs#fcm
```

Each Android device has the target that its app registered: a registration token by default, or a Firebase Installation ID (FID) when the app's manifest sets `firebase_messaging_installation_id_enabled`. The app gets the token in `FirebaseMessagingService.onNewToken()`, or the FID in `onRegistered()`. firebase-messaging 25.1.0 deprecates `getToken()`, `deleteToken()` and `onNewToken()` in favor of `register()`, `unregister()` and `onRegistered()`. Both sets work: the deprecated methods without the flag, and the new ones with it. The token stays the default because the flag applies to the whole app: with it, `FirebaseMessaging.getToken()` fails for every library in the app. For FID mode, use firebase-messaging 25.1.2 or later (Firebase Android BoM 34.18.0 or later): 25.1.1 fixed re-registration when the FID changes, and 25.1.2 fixed a `FID_ALREADY_USED` registration error.

`FirebaseAdmin` sends to a FID from [version 3.6.0](https://github.com/firebase/firebase-admin-dotnet/releases/tag/v3.6.0), with `Message.Fid`. That version also makes `Message.Token` obsolete: it still sends to a token, but setting it warns with CS0618, which the sample suppresses.

FCM requests carry Android options only. Send to Apple devices with the APNs requests.

## APNs

Send each APNs request with an HTTP/2 client, such as an `HttpClient` whose requests use `HttpVersion.Version20` with `HttpVersionPolicy.RequestVersionExact`: POST `PayloadJson` to `/3/device/` followed by the device token, with the request's `Headers`, such as `apns-push-type`, `apns-topic` and `apns-expiration`, and your APNs authorization.

iOS requires an app to report every VoIP push to CallKit as an incoming call, so `ApnsVoip` builds requests for `notification.call` only. A CallKit app stops ringing when its realtime connection reports that the ring stopped. A missed call also gets an APNs alert, and an answered or declined ring gets no APNs request. [Calls on iOS](https://github.com/ConvoHop/sdks/blob/main/spec/push-payload/README.md#calls-on-ios) has the details.

## How the samples are tested

The test runs `NotifyAsync` on every vector of the [push payload contract](https://github.com/ConvoHop/sdks/blob/main/spec/push-payload/README.md) and checks the request it sends to each kind of device. It also checks that `Lib.Net.Http.WebPush` sends each Web Push request's `TTL`, `Urgency` and `Topic` headers with a payload that the subscription's keys decrypt, and a VAPID token for each push service's origin, and that `FirebaseAdmin` sends each converted FCM message, to a token and to a FID, with the request's data and Android options.

## Next steps

- [`PushPayloads` reference](../reference/convohop.md#pushpayloads-class): every builder and its options.
- [Webhooks quickstart](webhooks.md): verify the deliveries that carry these events.
