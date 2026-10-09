# .NET push notifications quickstart

Send push notifications for ConvoHop messages and calls: `PushPayloads` turns notification events into APNs, FCM and Web Push requests, and you send them with your own push credentials and libraries.

## Before you start

ConvoHop doesn't send push notifications itself. You need:

- A webhook endpoint that receives `notification.message`, `notification.call` and `notification.callCancelled` events, as the [webhooks quickstart](webhooks.md) shows. Each of these events is addressed to one recipient. Events arrive at least once and in any order, so deduplicate on `EventId` before you send.
- The devices that your app registered for each user, in your own database.
- Your push credentials and clients. This page uses `FirebaseAdmin` for FCM and `Lib.Net.Http.WebPush` for browsers. For APNs, use any HTTP/2 client.

The samples use these namespaces:

```cs snippet=docs/languages/dotnet/examples/src/Push.cs#usings
using System;
using System.Collections.Generic;
using System.Net.Http;
using System.Threading;
using System.Threading.Tasks;
using ConvoHop;
using FirebaseAdmin.Messaging;
using Lib.Net.Http.WebPush;
using Lib.Net.Http.WebPush.Authentication;
```

## Build and send the requests

```cs snippet=docs/languages/dotnet/examples/src/Push.cs#notify
// A browser's PushSubscription.toJSON().
public sealed record WebSubscription(string Endpoint, WebSubscriptionKeys Keys);

public sealed record WebSubscriptionKeys(string P256dh, string Auth);

// An Android app's registration token, or its Firebase Installation ID (FID) when its manifest sets
// firebase_messaging_installation_id_enabled.
public abstract record FcmTarget;

public sealed record FcmToken(string Token) : FcmTarget;

public sealed record FcmFid(string Fid) : FcmTarget;

// The devices your app registered for a user, from your own database.
public abstract record Device;

public sealed record IosDevice(string Token, string? VoipToken = null) : Device; // VoipToken: the PushKit token of a CallKit app.

public sealed record AndroidDevice(FcmTarget Target) : Device;

public sealed record WebDevice(WebSubscription Subscription) : Device;

// Your push clients: an APNs HTTP/2 client, FirebaseAdmin and Lib.Net.Http.WebPush.
public interface IPushSenders
{
    Task ApnsAsync(string token, IReadOnlyDictionary<string, string> headers, string payloadJson, CancellationToken cancellationToken);
    Task FcmAsync(FcmTarget target, FcmRequest request, CancellationToken cancellationToken);
    Task WebPushAsync(WebSubscription subscription, WebPushRequest request, CancellationToken cancellationToken);
}

// options holds your iOS app's BundleId, which only the APNs builders use, and your own Title and Body,
// such as the sender's name.
public static async Task NotifyAsync(
    WebhookNotificationEvent notification, IEnumerable<Device> devices, IPushSenders senders, ApnsPushOptions options,
    CancellationToken cancellationToken)
{
    foreach (Device device in devices)
    {
        // Each builder returns null when the event doesn't apply to the platform or is stale. Send nothing then.
        switch (device)
        {
            case IosDevice ios:
                // A CallKit app gets incoming calls as VoIP pushes, and must report each one to CallKit.
                if (!string.IsNullOrEmpty(ios.VoipToken) && PushPayloads.ApnsVoip(notification, options) is { } voip)
                    await senders.ApnsAsync(ios.VoipToken, voip.Headers, voip.PayloadJson, cancellationToken);
                // ApnsAlert returns null when a ring was answered or declined.
                else if (PushPayloads.ApnsAlert(notification, options) is { } alert)
                    await senders.ApnsAsync(ios.Token, alert.Headers, alert.PayloadJson, cancellationToken);
                break;
            case AndroidDevice android when PushPayloads.Fcm(notification, options) is { } fcm:
                await senders.FcmAsync(android.Target, fcm, cancellationToken);
                break;
            case WebDevice web when PushPayloads.WebPush(notification, options) is { } webPush:
                await senders.WebPushAsync(web.Subscription, webPush, cancellationToken);
                break;
        }
    }
}
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

```cs snippet=docs/languages/dotnet/examples/src/Push.cs#web-push
// Create one client and share it. The VAPID keys are your key pair from your secret store, as URL-safe
// base64, and subject is a mailto: or https: URL where push services can reach you.
public static PushServiceClient CreateWebPushClient(
    HttpClient httpClient, string vapidPublicKey, string vapidPrivateKey, string subject) =>
    new(httpClient)
    {
        DefaultAuthentication = new VapidAuthentication(vapidPublicKey, vapidPrivateKey) { Subject = subject },
    };

public static Task SendWebPushAsync(
    PushServiceClient client, WebSubscription subscription, WebPushRequest request, CancellationToken cancellationToken)
{
    var target = new PushSubscription { Endpoint = subscription.Endpoint };
    target.SetKey(PushEncryptionKeyName.P256DH, subscription.Keys.P256dh);
    target.SetKey(PushEncryptionKeyName.Auth, subscription.Keys.Auth);
    // The library encrypts the payload for the subscription, and sets the TTL, Urgency and Topic headers from
    // these properties, not from request.Headers. Without TimeToLive, it sends a TTL of four weeks.
    var message = new PushMessage(request.PayloadJson)
    {
        TimeToLive = checked((int)request.TtlSeconds),
        Urgency = Enum.Parse<PushMessageUrgency>(request.Urgency, ignoreCase: true),
        Topic = request.Topic,
    };
    return client.RequestPushMessageDeliveryAsync(target, message, cancellationToken);
}
```

One `PushServiceClient` serves every subscription: it signs each VAPID token for the origin of the subscription's push service.

## FCM: FirebaseAdmin takes a TimeSpan and a Priority enum

`MessageJson` is an FCM HTTP v1 message without a target, in the REST form, where `ttl` is a string of seconds such as `"45s"` and `priority` is uppercase, such as `"HIGH"`. To send it through the FCM REST API, add `token` or `fid`.

`FirebaseAdmin` takes the request's `Data` and its Android options in its own form: `TimeToLive` is a `TimeSpan` and `Priority` is an enum. Convert the options:

```cs snippet=docs/languages/dotnet/examples/src/Push.cs#fcm
// FirebaseAdmin takes Android options in its own form: a Priority enum and a TimeSpan TTL. The request's
// REST form, such as "HIGH" and "45s", is for MessageJson.
public static Message FirebaseMessage(FcmTarget target, FcmRequest request)
{
    var message = new Message
    {
        Data = request.Data,
        Android = new AndroidConfig
        {
            Priority = Enum.Parse<Priority>(request.Android.Priority, ignoreCase: true),
            TimeToLive = TimeSpan.FromSeconds(request.Android.TtlSeconds),
            CollapseKey = request.Android.CollapseKey,
        },
    };
    switch (target)
    {
        case FcmFid fid:
            message.Fid = fid.Fid; // FirebaseAdmin sends to a FID from 3.6.0.
            break;
        case FcmToken token:
            #pragma warning disable CS0618 // From 3.6.0, Token is obsolete. It still sends to a token.
            message.Token = token.Token;
            #pragma warning restore CS0618
            break;
        default:
            throw new ArgumentException("Unknown FCM target.", nameof(target));
    }
    return message;
}

// Create the default FirebaseApp with your service account first, and pass FirebaseMessaging.DefaultInstance.
public static Task<string> SendFcmAsync(
    FirebaseMessaging messaging, FcmTarget target, FcmRequest request, CancellationToken cancellationToken) =>
    messaging.SendAsync(FirebaseMessage(target, request), cancellationToken);
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
