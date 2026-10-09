# Java and Kotlin push notifications quickstart

Send push notifications for ConvoHop messages and calls: `convohop-server` turns notification events into APNs, FCM and Web Push requests, and you send them with your own push credentials and libraries.

## Before you start

ConvoHop doesn't send push notifications itself. You need:

- A webhook endpoint that receives `notification.message`, `notification.call` and `notification.callCancelled` events, as the [webhooks quickstart](webhooks.md) shows. Each of these events is addressed to one recipient. Events arrive at least once and in any order, so deduplicate on `getEventId()` before you send.
- The devices that your app registered for each user, in your own database.
- Your push credentials and clients. This page uses the Firebase Admin SDK for Java, `com.google.firebase:firebase-admin` 9.10.0 or later, for FCM. For browsers, use a Web Push library, and for APNs, any HTTP/2 client.

The sample uses these imports:

```java include=examples/src/main/java/com/convohop/examples/Push.java#imports
```

## Build and send the requests

```java include=examples/src/main/java/com/convohop/examples/Push.java#notify
```

Each `PushPayloads` builder returns null when the event doesn't apply to the platform or has expired, and then you send nothing. The APNs builders take your iOS app's bundle ID for the `apns-topic` header, and throw `IllegalArgumentException` if it isn't valid. `PushOptions` applies to every builder:

- `title` and `body` are visible text of your own, such as the sender's name. Without them, a request carries only the event's metadata, plus the start of the message when the project turns on message previews.
- `preview(false)` keeps a message's preview out of the body when you set no body.

A request expires when its event stops being relevant: a day after a message or a missed call, and when the ring stops for a call. A call and its cancellation share a collapse key, so a push service that still holds the call's request replaces it with the cancellation's.

The requests use each service's wire format: APNs headers and a payload, an FCM HTTP v1 message, and Web Push headers and a payload. Web Push libraries and the Firebase Admin SDK take some of these values in their own form, as the next two sections show.

## Web Push: pass the headers as options

Web Push requests for calls and cancellations have the `Urgency: high` header, so the push service and the device don't hold them back to save battery. Message requests have `Urgency: normal`.

A Web Push library encrypts the payload, signs the request with your VAPID keys and sets some headers itself, which can replace the headers you pass. Give it `getPayload()` as the plaintext, and pass `getTtlSeconds()`, `getUrgency()` and `getTopic()` as its own TTL, urgency and topic options, so a call isn't delivered at normal urgency.

## FCM: the Firebase Admin TTL is in milliseconds

`getMessage()` is an FCM HTTP v1 message without a target, in the REST form, where `ttl` is a string of seconds such as `"45s"`. To send it through the FCM REST API, add `token` or `fid`.

The Firebase Admin SDK for Java takes the Android options in its own form, with the TTL in milliseconds. Convert them:

```java include=examples/src/main/java/com/convohop/examples/Push.java#fcm-imports
```

```java include=examples/src/main/java/com/convohop/examples/Push.java#fcm
```

Each Android device has the target that its app registered: a registration token by default, or a Firebase Installation ID (FID) when the app's manifest sets `firebase_messaging_installation_id_enabled`. The app gets the token in `FirebaseMessagingService.onNewToken()`, or the FID in `onRegistered()`. firebase-messaging 25.1.0 deprecates `getToken()`, `deleteToken()` and `onNewToken()` in favor of `register()`, `unregister()` and `onRegistered()`. Both sets work: the deprecated methods without the flag, and the new ones with it. The token stays the default because the flag applies to the whole app: with it, `FirebaseMessaging.getToken()` fails for every library in the app. For FID mode, use firebase-messaging 25.1.2 or later (Firebase Android BoM 34.18.0 or later): 25.1.1 fixed re-registration when the FID changes, and 25.1.2 fixed a `FID_ALREADY_USED` registration error.

The Firebase Admin SDK for Java sends to a FID from [version 9.10.0](https://github.com/firebase/firebase-admin-java/releases/tag/v9.10.0), with `Message.Builder.setFid`. That version also deprecates `setToken`, which still sends to a token.

FCM requests carry Android options only. Send to Apple devices with the APNs requests.

## APNs

Send each APNs request with an HTTP/2 client: POST its `getPayload()` as JSON to `/3/device/` followed by the device token, with its `getHeaders()`, such as `apns-push-type`, `apns-topic` and `apns-expiration`, and your APNs authorization.

iOS requires an app to report every VoIP push to CallKit as an incoming call, so `apnsVoip` builds requests for `notification.call` only. A CallKit app stops ringing when its realtime connection reports that the ring stopped. A missed call also gets an APNs alert, and an answered or declined ring gets no APNs request. [Calls on iOS](https://github.com/ConvoHop/sdks/blob/main/spec/push-payload/README.md#calls-on-ios) has the details.

## How the sample is tested

The test runs `notifyDevices` on every vector of the [push payload contract](https://github.com/ConvoHop/sdks/blob/main/spec/push-payload/README.md) and checks the request it sends to each kind of device against the vector's expected request. It also sends each converted FCM message through the Firebase Admin SDK to a mock FCM, to a token and to a FID, and checks that FCM receives the request's data and Android options. CI doesn't run a Web Push library or an APNs client, so the Web Push and APNs sections aren't tested.

## Next steps

- [`PushPayloads` reference](../reference/server.md#pushpayloads-class): every builder.
- [`PushOptions` reference](../reference/server.md#pushoptions-class): the title, body, preview and clock options.
