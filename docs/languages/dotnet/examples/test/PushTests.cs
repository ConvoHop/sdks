using System;
using System.Collections.Generic;
using System.Linq;
using System.Net;
using System.Net.Http;
using System.Reflection;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json.Nodes;
using System.Threading;
using System.Threading.Tasks;
using ConvoHop;
using FirebaseAdmin;
using FirebaseAdmin.Messaging;
using Google.Apis.Auth.OAuth2;
using Google.Apis.Http;
using Lib.Net.Http.WebPush;
using Lib.Net.Http.WebPush.Authentication;
using Xunit;

namespace Examples.Tests;

public sealed class PushTests
{
    private static readonly CancellationToken None = CancellationToken.None;

    // The browser's keys, so the tests can decrypt what Lib.Net.Http.WebPush sends.
    private static readonly ECDiffieHellman Receiver = ECDiffieHellman.Create(ECCurve.NamedCurves.nistP256);
    private static readonly byte[] ReceiverKey = PublicKey(Receiver.ExportParameters(false));
    private static readonly byte[] AuthSecret = RandomNumberGenerator.GetBytes(16);
    private static readonly PushExamples.WebSubscription Subscription = new(
        "https://push.example/send/subscription-1",
        new PushExamples.WebSubscriptionKeys(UrlBase64.Encode(ReceiverKey), UrlBase64.Encode(AuthSecret)));

    // Your VAPID key pair.
    private static readonly ECDsa Vapid = ECDsa.Create(ECCurve.NamedCurves.nistP256);
    private static readonly string VapidPublicKey = UrlBase64.Encode(PublicKey(Vapid.ExportParameters(false)));
    private static readonly string VapidPrivateKey = UrlBase64.Encode(Vapid.ExportParameters(true).D!);
    private const string VapidSubject = "mailto:push@app.example";

    // An Android app's registration token, which it gets by default, and a FID.
    private static readonly PushExamples.FcmTarget[] FcmTargets =
        [new PushExamples.FcmToken("android-token"), new PushExamples.FcmFid("android-fid")];
    private static readonly PushExamples.Device[] Devices =
    [
        new PushExamples.IosDevice("ios-token"),
        new PushExamples.IosDevice("callkit-token", VoipToken: "callkit-voip-token"),
        .. FcmTargets.Select(target => new PushExamples.AndroidDevice(target)),
        new PushExamples.WebDevice(Subscription),
    ];

    public static TheoryData<string> VectorIds() => new(Vectors.Push().Select(vector => (string)vector["id"]!));

    public static TheoryData<string> WebPushVectorIds() => new(
        Vectors.Push().Where(vector => Vectors.Expected(vector, "webPush") != null).Select(vector => (string)vector["id"]!));

    private static byte[] PublicKey(ECParameters parameters) => [0x04, .. parameters.Q.X!, .. parameters.Q.Y!];

    // The event as your webhook endpoint receives it.
    private static WebhookNotificationEvent Received(JsonNode @event)
    {
        string secret = Deliveries.NewSecret();
        Delivery delivery = Deliveries.Sign(@event, secret);
        return Assert.IsAssignableFrom<WebhookNotificationEvent>(
            Webhooks.Verify(WebhookHeaders.From(delivery.Headers), delivery.Body, [secret]).Event);
    }

    // The vector's builder options.
    private static ApnsPushOptions BuilderOptions(JsonObject vector)
    {
        JsonObject given = vector["options"]!.AsObject();
        Assert.True(
            given.All(option => option.Key is "bundleId" or "title" or "body" or "preview"),
            "Forward the new builder option in NotifyAsync.");
        return new ApnsPushOptions((string)given["bundleId"]!)
        {
            Title = (string?)given["title"],
            Body = (string?)given["body"],
            Preview = given["preview"] is JsonNode preview ? (bool)preview : true,
            Now = DateTimeOffset.FromUnixTimeSeconds((long)vector["nowSeconds"]!),
        };
    }

    private static JsonObject Json(IReadOnlyDictionary<string, string> headers) =>
        new(headers.Select(header => KeyValuePair.Create(header.Key, (JsonNode?)header.Value)));

    // Each send as [sender, target, request], with the request in the vectors' shape.
    private sealed class RecordingSenders : PushExamples.IPushSenders
    {
        public JsonArray Sent { get; } = new();

        public Task ApnsAsync(
            string token, IReadOnlyDictionary<string, string> headers, string payloadJson, CancellationToken cancellationToken) =>
            Record("apns", token, new JsonObject { ["headers"] = Json(headers), ["payload"] = JsonNode.Parse(payloadJson) });

        public Task FcmAsync(PushExamples.FcmTarget target, FcmRequest request, CancellationToken cancellationToken) =>
            Record("fcm", target.ToString(), new JsonObject { ["message"] = JsonNode.Parse(request.MessageJson) });

        public Task WebPushAsync(
            PushExamples.WebSubscription subscription, WebPushRequest request, CancellationToken cancellationToken) =>
            Record("webPush", subscription.Endpoint,
                new JsonObject { ["headers"] = Json(request.Headers), ["payload"] = JsonNode.Parse(request.PayloadJson) });

        private Task Record(string sender, string target, JsonNode request)
        {
            Sent.Add(new JsonArray(sender, target, request));
            return Task.CompletedTask;
        }
    }

    [Theory]
    [MemberData(nameof(VectorIds))]
    public async Task NotifySendsEachDeviceTheRequestTheVectorExpects(string id)
    {
        JsonObject vector = Vectors.ById(id);
        var senders = new RecordingSenders();
        await PushExamples.NotifyAsync(Received(vector["event"]!), Devices, senders, BuilderOptions(vector), None);

        JsonNode? alert = Vectors.Expected(vector, "apnsAlert"), voip = Vectors.Expected(vector, "apnsVoip");
        JsonNode? fcm = Vectors.Expected(vector, "fcm"), web = Vectors.Expected(vector, "webPush");
        var expected = new JsonArray();
        void Expect(string sender, string target, JsonNode request) =>
            expected.Add(new JsonArray(sender, target, request.DeepClone()));
        if (alert != null) Expect("apns", "ios-token", alert);
        if (voip != null) Expect("apns", "callkit-voip-token", voip);
        else if (alert != null) Expect("apns", "callkit-token", alert);
        if (fcm != null)
        {
            foreach (PushExamples.FcmTarget target in FcmTargets) Expect("fcm", target.ToString(), fcm);
        }
        if (web != null) Expect("webPush", Subscription.Endpoint, web);
        Assert.Equal(expected.ToJsonString(), senders.Sent.ToJsonString());
    }

    // What Lib.Net.Http.WebPush posts to a push service.
    private sealed record Post(Uri Url, IReadOnlyDictionary<string, string> Headers, byte[] Body)
    {
        public string? Header(string name) => Headers.TryGetValue(name, out string? value) ? value : null;

        // The payload, decrypted with the browser's keys: RFC 8291 keys in the RFC 8188 aes128gcm format, whose header
        // is the salt (16 bytes), the record size (4), the key ID's length (1) and the key ID, the sender's public key.
        public byte[] Decrypted()
        {
            byte[] salt = Body[..16], senderKey = Body[21..(21 + Body[20])], record = Body[(21 + Body[20])..];
            using ECDiffieHellman sender = ECDiffieHellman.Create(new ECParameters
            {
                Curve = ECCurve.NamedCurves.nistP256,
                Q = new ECPoint { X = senderKey[1..33], Y = senderKey[33..] },
            });
            byte[] secret = Receiver.DeriveRawSecretAgreement(sender.PublicKey);
            byte[] ikm = HKDF.DeriveKey(
                HashAlgorithmName.SHA256, secret, 32, AuthSecret, [.. "WebPush: info\0"u8, .. ReceiverKey, .. senderKey]);
            byte[] key = HKDF.DeriveKey(HashAlgorithmName.SHA256, ikm, 16, salt, "Content-Encoding: aes128gcm\0"u8.ToArray());
            byte[] nonce = HKDF.DeriveKey(HashAlgorithmName.SHA256, ikm, 12, salt, "Content-Encoding: nonce\0"u8.ToArray());
            byte[] padded = new byte[record.Length - 16];
            using (var aes = new AesGcm(key, 16))
                aes.Decrypt(nonce, record.AsSpan(0, padded.Length), record.AsSpan(padded.Length), padded);
            // The last record ends with the delimiter 2, then any zero padding.
            int end = Array.FindLastIndex(padded, octet => octet != 0);
            Assert.Equal(2, padded[end]);
            return padded[..end];
        }

        // The claims of the VAPID JWT, after checking that your VAPID key signed it.
        public JsonNode VapidClaims()
        {
            string authorization = Header("Authorization")!;
            Assert.StartsWith("vapid t=", authorization);
            Assert.EndsWith($", k={VapidPublicKey}", authorization);
            string[] token = authorization["vapid t=".Length..].Split(',')[0].Split('.');
            Assert.True(Vapid.VerifyData(
                Encoding.ASCII.GetBytes($"{token[0]}.{token[1]}"), UrlBase64.Decode(token[2]), HashAlgorithmName.SHA256));
            return JsonNode.Parse(UrlBase64.Decode(token[1]))!;
        }
    }

    // A push service, which answers 201 Created.
    private sealed class PushService : HttpMessageHandler
    {
        public List<Post> Posts { get; } = [];

        protected override async Task<HttpResponseMessage> SendAsync(HttpRequestMessage request, CancellationToken cancellationToken)
        {
            var headers = new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase);
            IEnumerable<KeyValuePair<string, IEnumerable<string>>> all =
                request.Content == null ? request.Headers : request.Headers.Concat(request.Content.Headers);
            foreach (KeyValuePair<string, IEnumerable<string>> header in all) headers[header.Key] = string.Join(", ", header.Value);
            byte[] body = request.Content == null ? [] : await request.Content.ReadAsByteArrayAsync(cancellationToken);
            Posts.Add(new Post(request.RequestUri!, headers, body));
            return new HttpResponseMessage(HttpStatusCode.Created);
        }
    }

    private static WebPushRequest BuildWebPush(string id)
    {
        JsonObject vector = Vectors.ById(id);
        return PushPayloads.WebPush(Received(vector["event"]!), BuilderOptions(vector))!;
    }

    [Theory]
    [MemberData(nameof(WebPushVectorIds))]
    public async Task SendWebPushSendsThePayloadWithTheRequestsTtlUrgencyAndTopic(string id)
    {
        WebPushRequest request = BuildWebPush(id);
        var service = new PushService();
        using var http = new HttpClient(service);
        PushServiceClient client = PushExamples.CreateWebPushClient(http, VapidPublicKey, VapidPrivateKey, VapidSubject);
        using VapidAuthentication vapid = client.DefaultAuthentication;

        await PushExamples.SendWebPushAsync(client, Subscription, request, None);

        Post sent = Assert.Single(service.Posts);
        Assert.Equal(Subscription.Endpoint, sent.Url.AbsoluteUri);
        JsonObject headers = Vectors.Expected(Vectors.ById(id), "webPush")!["headers"]!.AsObject();
        string? urgency = (string?)headers["Urgency"];
        // Lib.Net.Http.WebPush leaves out Urgency: normal, which is the default.
        Assert.Equal(
            ((string?)headers["TTL"], urgency == "normal" ? null : urgency, (string?)headers["Topic"]),
            (sent.Header("TTL"), sent.Header("Urgency"), sent.Header("Topic")));
        Assert.Equal("aes128gcm", sent.Header("Content-Encoding"));
        Assert.Equal(request.PayloadJson, Encoding.UTF8.GetString(sent.Decrypted()));
        JsonNode claims = sent.VapidClaims();
        Assert.Equal("https://push.example", (string?)claims["aud"]);
        Assert.Equal(VapidSubject, (string?)claims["sub"]);
    }

    [Fact]
    public async Task OneClientSignsForEachPushServiceAndWithoutTimeToLiveSendsFourWeeks()
    {
        WebPushRequest request = BuildWebPush("call-incoming");
        var service = new PushService();
        using var http = new HttpClient(service);
        PushServiceClient client = PushExamples.CreateWebPushClient(http, VapidPublicKey, VapidPrivateKey, VapidSubject);
        using VapidAuthentication vapid = client.DefaultAuthentication;

        // Why SendWebPushAsync sets TimeToLive: the library doesn't read request.Headers.
        var target = new PushSubscription { Endpoint = Subscription.Endpoint };
        target.SetKey(PushEncryptionKeyName.P256DH, Subscription.Keys.P256dh);
        target.SetKey(PushEncryptionKeyName.Auth, Subscription.Keys.Auth);
        await client.RequestPushMessageDeliveryAsync(target, new PushMessage(request.PayloadJson), None);
        Assert.Equal("45", request.Headers["TTL"]);
        Assert.Equal("2419200", service.Posts[^1].Header("TTL"));

        // Why one shared client is enough: it signs for each push service's origin.
        PushExamples.WebSubscription other = Subscription with { Endpoint = "https://push.other.example/send/subscription-2" };
        foreach (PushExamples.WebSubscription subscription in new[] { Subscription, other })
            await PushExamples.SendWebPushAsync(client, subscription, request, None);
        Assert.Equal(
            new[] { "https://push.example", "https://push.other.example" },
            service.Posts.TakeLast(2).Select(post => (string?)post.VapidClaims()["aud"]));
    }

    // FCM, which answers with the message's name. FirebaseAdmin posts { "message": ..., "validate_only": false }.
    private sealed class FcmService : HttpClientFactory
    {
        public List<JsonNode> Sent { get; } = [];

        protected override HttpMessageHandler CreateHandler(CreateHttpClientArgs args) => new Handler(Sent);

        private sealed class Handler(List<JsonNode> sent) : HttpMessageHandler
        {
            protected override async Task<HttpResponseMessage> SendAsync(
                HttpRequestMessage request, CancellationToken cancellationToken)
            {
                sent.Add(JsonNode.Parse(await request.Content!.ReadAsStringAsync(cancellationToken))!);
                return new HttpResponseMessage(HttpStatusCode.OK)
                {
                    Content = new StringContent("""{"name":"projects/p/messages/1"}""", Encoding.UTF8, "application/json"),
                };
            }
        }
    }

    [Fact]
    public async Task SendFcmSendsTheRequestsDataAndAndroidOptionsToATokenOrAFid()
    {
        List<(JsonObject Vector, FcmRequest Request)> requests = [];
        foreach (JsonObject vector in Vectors.Push())
        {
            if (PushPayloads.Fcm(Received(vector["event"]!), BuilderOptions(vector)) is { } request) requests.Add((vector, request));
        }
        Assert.NotEmpty(requests);
        var fcm = new FcmService();
        FirebaseApp app = FirebaseApp.Create(
            new AppOptions { Credential = GoogleCredential.FromAccessToken("test"), ProjectId = "p", HttpClientFactory = fcm },
            $"push-tests-{Guid.NewGuid()}");
        try
        {
            FirebaseMessaging messaging = FirebaseMessaging.GetMessaging(app);
            foreach ((JsonObject vector, FcmRequest request) in requests)
            {
                foreach (PushExamples.FcmTarget target in FcmTargets)
                {
                    Assert.Equal("projects/p/messages/1", await PushExamples.SendFcmAsync(messaging, target, request, None));
                    // The request's message, with FirebaseAdmin's lowercase priority, to the token or the FID.
                    JsonObject expected = Vectors.Expected(vector, "fcm")!["message"]!.DeepClone().AsObject();
                    expected["android"]!["priority"] = ((string)expected["android"]!["priority"]!).ToLowerInvariant();
                    (string key, string value) = target switch
                    {
                        PushExamples.FcmToken token => ("token", token.Token),
                        PushExamples.FcmFid fid => ("fid", fid.Fid),
                        _ => throw new ArgumentOutOfRangeException(nameof(target)),
                    };
                    expected[key] = value;
                    JsonNode? sent = fcm.Sent[^1]["message"];
                    Assert.True(JsonNode.DeepEquals(expected, sent), $"{vector["id"]}: {sent?.ToJsonString()}");
                }
            }
        }
        finally
        {
            app.Delete();
        }

        // Why FirebaseMessage converts: FirebaseAdmin takes a Priority enum and a TimeSpan, not the REST form.
        FcmRequest call = requests.Single(pair => (string?)pair.Vector["id"] == "call-incoming").Request;
        Assert.Equal("HIGH", call.Android.Priority);
        Assert.Equal("45s", call.Android.Ttl);
        Assert.Equal(45, call.Android.TtlSeconds);
        // From FirebaseAdmin 3.6.0, Token is obsolete. It still sends to a token, as above.
        Assert.NotNull(typeof(Message).GetProperty("Token")!.GetCustomAttribute<ObsoleteAttribute>());
    }
}

internal static class UrlBase64
{
    public static string Encode(byte[] bytes) => Convert.ToBase64String(bytes).TrimEnd('=').Replace('+', '-').Replace('/', '_');

    public static byte[] Decode(string text) =>
        Convert.FromBase64String(text.Replace('-', '+').Replace('_', '/') + new string('=', (4 - text.Length % 4) % 4));
}
