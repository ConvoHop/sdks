// The push quickstart's samples. test/PushTests.cs runs them on every vector in spec/push-payload.

#region usings
using System;
using System.Collections.Generic;
using System.Net.Http;
using System.Threading;
using System.Threading.Tasks;
using ConvoHop;
using FirebaseAdmin.Messaging;
using Lib.Net.Http.WebPush;
using Lib.Net.Http.WebPush.Authentication;
#endregion usings

namespace Examples;

public static class PushExamples
{
    #region notify
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
    #endregion notify

    #region web-push
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
    #endregion web-push

    #region fcm
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
    #endregion fcm
}
