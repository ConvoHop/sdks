using System;
using System.Collections.Generic;
using System.Globalization;
using System.Linq;
using System.Net.Http;
using System.Reflection;
using System.Text;
using System.Text.Json;
using System.Text.Json.Nodes;
using ConvoHop.Tests.TestSupport;
using Xunit;
using static ConvoHop.WebhookVerificationCode;

namespace ConvoHop.Tests
{
    public sealed class WebhookTests
    {
        private static readonly DateTimeOffset Now = new DateTimeOffset(2026, 10, 10, 12, 0, 0, TimeSpan.Zero);
        private static readonly long Timestamp = Now.ToUnixTimeSeconds();
        private static readonly string WebhookId = Fixtures.NewId();
        private static readonly string Current = WebhookSigner.NewSecret();
        private static readonly string Next = WebhookSigner.NewSecret();
        private static readonly string Replaced = WebhookSigner.NewSecret();

        /// <summary>Shared conformance codes, mapped to this verifier's reason codes.</summary>
        private static readonly Dictionary<string, WebhookVerificationCode> SharedCodes = new Dictionary<string, WebhookVerificationCode>
        {
            ["WEBHOOK_SIGNATURE_INVALID"] = NoMatchingSignature,
            ["WEBHOOK_TIMESTAMP_EXPIRED"] = TimestampExpired,
            ["WEBHOOK_TIMESTAMP_FUTURE"] = TimestampFuture,
            ["WEBHOOK_TIMESTAMP_INVALID"] = InvalidTimestamp,
            ["WEBHOOK_HEADERS_MISSING"] = MissingHeader,
        };

        /// <summary>The event types in the webhook contract (ConvoHop/ConveHop docs/webhooks.md, "Events").</summary>
        private static readonly string[] ContractEventTypes =
        {
            "conversation.created", "conversation.updated",
            "member.added", "member.roleChanged", "member.historyExpanded", "member.removed", "member.broadcastPermissionChanged",
            "message.created", "message.edited", "message.deleted", "receipt.reported",
            "live.started", "live.participationChanged", "live.alerted", "live.ready", "live.connected", "live.ended",
            "webhook.endpointDisabled",
        };

        public static IEnumerable<object[]> SharedVectorIds() =>
            Spec.Load("webhooks.json")["vectors"]!.AsArray().Select(vector => new object[] { (string)vector!["id"]! });

        [Fact]
        public void TheContractTestVectorVerifiesAndItsBodyIsNotAConvoHopEvent()
        {
            const string secret = "whsec_MfKQ9r8GKYqrTwjUPD8ILPZIo2LaLaSw", id = "msg_p5jXN8AQM9LWM0D4loKWxJek", stamp = "1614265330";
            const string body = "{\"test\": 2432232314}", signature = "v1,g0hM9SsE+OTPJTGt/tmIKtSyZlE3uFJELVlNIOLJ1OE=";
            Assert.Equal(signature, WebhookSigner.Sign(secret, id, stamp, body));
            WebhookHeaders headers = WebhookHeaders.From(new Dictionary<string, string>
            {
                ["webhook-id"] = id, ["webhook-timestamp"] = stamp, ["webhook-signature"] = signature,
            });
            string[] secrets = { secret };
            DateTimeOffset now = DateTimeOffset.FromUnixTimeSeconds(1614265330);
            AssertSignature(id, 1614265330, Webhooks.VerifySignature(headers, body, secrets, now: now));
            AssertSignature(id, 1614265330, Webhooks.VerifySignature(headers, Encoding.UTF8.GetBytes(body), secrets, now: now));
            Rejects(InvalidBody, () => Webhooks.Verify(headers, body, secrets, now: now));
            Rejects(TimestampExpired, () => Webhooks.VerifySignature(headers, body, secrets));
        }

        [Theory]
        [MemberData(nameof(SharedVectorIds))]
        public void TheSharedConformanceVectorsGiveTheSameVerdicts(string id)
        {
            JsonNode shared = Spec.Load("webhooks.json");
            Assert.Equal("standard-webhooks-v1", (string?)shared["scheme"]);
            JsonNode vector = shared["vectors"]!.AsArray().Single(item => (string?)item!["id"] == id)!;
            Dictionary<string, string> headers = vector["headers"]!.AsObject()
                .ToDictionary(header => header.Key, header => (string)header.Value!);
            string[] secrets = vector["secrets"]!.AsArray().Select(secret => (string)secret!).ToArray();
            string body = (string)vector["payload"]!;
            long tolerance = (long)vector["toleranceSeconds"]!;
            DateTimeOffset now = DateTimeOffset.FromUnixTimeSeconds((long)vector["nowSeconds"]!);
            string? Value(string name) =>
                headers.FirstOrDefault(header => string.Equals(header.Key, name, StringComparison.OrdinalIgnoreCase)).Value;

            WebhookSignature Check() => Webhooks.VerifySignature(WebhookHeaders.From(headers), body, secrets, tolerance, now);
            if ((bool)vector["expected"]!["valid"]!)
            {
                AssertSignature(Value("webhook-id")!, long.Parse(Value("webhook-timestamp")!, CultureInfo.InvariantCulture), Check());
            }
            else
            {
                string code = (string)vector["expected"]!["code"]!;
                Assert.True(SharedCodes.ContainsKey(code), id + ": unmapped " + code);
                Rejects(SharedCodes[code], () => Check());
            }
        }

        [Fact]
        public void AVerifiedDeliveryReturnsItsIdTimestampAndMetadataOnlyEvent()
        {
            JsonObject envelope = Envelope();
            VerifiedWebhookDelivery verified = Verify(Js.Stringify(envelope));
            Assert.Equal(WebhookId, verified.WebhookId);
            Assert.Equal(Timestamp, verified.Timestamp);
            Assert.IsType<WebhookResourceEvent>(verified.Event);
            Js.Equal(Js.With(envelope, new JsonObject { ["known"] = true }), Events.ToJson(verified.Event));
            foreach (string eventType in ContractEventTypes)
            {
                string kind = eventType == "webhook.endpointDisabled" ? "webhookEndpoint" : eventType.Split('.')[0];
                WebhookEvent result = Verify(Js.Stringify(Envelope(new JsonObject
                {
                    ["eventType"] = eventType, ["subjectRef"] = new JsonObject { ["id"] = Fixtures.NewId(), ["kind"] = kind },
                }))).Event;
                Assert.True(result.Known, eventType);
                Assert.Equal(eventType, result.EventType);
                Assert.Equal(kind, result.SubjectRef.Kind);
                Assert.IsType(eventType == "webhook.endpointDisabled" ? typeof(WebhookEndpointDisabledEvent) : typeof(WebhookResourceEvent),
                    result);
            }

            // The constants are the contract's event types plus the notification events.
            IEnumerable<string> constants = typeof(WebhookEventTypes).GetFields(BindingFlags.Public | BindingFlags.Static)
                .Select(field => (string)field.GetRawConstantValue()!);
            Assert.Equal(ContractEventTypes.Concat(new[] { "notification.message", "notification.call", "notification.callCancelled" })
                .OrderBy(name => name, StringComparer.Ordinal), constants.OrderBy(name => name, StringComparer.Ordinal));
        }

        [Fact]
        public void UnknownEventTypesAndFieldsPassThroughAndNeverThrow()
        {
            WebhookEvent unknown = Verify(Js.Stringify(Envelope(new JsonObject
            {
                ["eventType"] = "message.reacted", ["extra"] = new JsonObject { ["a"] = 1 },
            }))).Event;
            Assert.IsType<WebhookUnknownEvent>(unknown);
            Assert.False(unknown.Known);
            Assert.Equal("message.reacted", unknown.EventType);
            WebhookEvent misfiled = Verify(Js.Stringify(Envelope(new JsonObject
            {
                ["eventType"] = "webhook.endpointDisabled",
                ["subjectRef"] = new JsonObject { ["id"] = Fixtures.NewId(), ["kind"] = "conversation" },
            }))).Event;
            Assert.IsType<WebhookUnknownEvent>(misfiled);
            Assert.Equal("conversation", misfiled.SubjectRef.Kind);
        }

        [Fact]
        public void NotificationEventsVerifyAsKnownEventsWithOnlyTheirContractFields()
        {
            var events = new List<JsonObject>
            {
                Notification("notification.message"),
                Notification("notification.message", new JsonObject
                {
                    ["connected"] = true, ["preview"] = new JsonObject { ["text"] = "Grüße, 世界 👋", ["truncated"] = true },
                }),
                Notification("notification.message", new JsonObject
                {
                    ["preview"] = new JsonObject { ["text"] = Js.Repeat("👋", 512), ["truncated"] = false },
                }),
                Notification("notification.call"),
                Notification("notification.call", new JsonObject { ["mediaProfile"] = "AUDIO_ONLY", ["connected"] = true }),
            };
            foreach (string reason in new[] { "answered", "declined", "ended", "expired" })
                events.Add(Notification("notification.callCancelled", new JsonObject { ["reason"] = reason }));
            // Media profiles and cancel reasons are open enumerations.
            events.Add(Notification("notification.callCancelled", new JsonObject
            {
                ["mediaProfile"] = "SCREEN_SHARE", ["reason"] = "transferred",
            }));
            events.Add(Notification("notification.call", new JsonObject
            {
                ["occurredAt"] = "2026-10-10T13:59:59.123456789+02:00", ["expiresAt"] = "2028-02-29T00:00:00Z",
            }));
            foreach (JsonObject value in events)
            {
                JsonObject subjectRef = Js.With(value["subjectRef"]!.AsObject(), new JsonObject { ["label"] = "ignored" });
                string body = Js.Stringify(Js.With(value, new JsonObject
                {
                    ["addedLater"] = new JsonObject { ["nested"] = new JsonArray(1) }, ["subjectRef"] = subjectRef,
                }));
                VerifiedWebhookDelivery verified = Verify(body);
                Assert.Equal(WebhookId, verified.WebhookId);
                Assert.Equal(Timestamp, verified.Timestamp);
                Assert.IsAssignableFrom<WebhookNotificationEvent>(verified.Event);
                Js.Equal(Js.With(value, new JsonObject { ["known"] = true }), Events.ToJson(verified.Event), (string?)value["eventType"]);
            }
        }

        [Fact]
        public void TheLargestNotificationEventFitsInAWebhookBody()
        {
            JsonObject largest = Notification("notification.message", new JsonObject
            {
                ["occurredAt"] = "2026-10-10T23:59:59.999999999-23:59",
                ["preview"] = new JsonObject { ["text"] = new string('\u0001', 512), ["truncated"] = false },
            });
            string body = Js.Stringify(largest);
            Assert.True(Js.Bytes(body) <= 4096, Js.Bytes(body).ToString(CultureInfo.InvariantCulture));
            Js.Equal(Js.With(largest, new JsonObject { ["known"] = true }), Events.ToJson(Verify(body).Event));
        }

        [Fact]
        public void NotificationEventsThatBreakThePushPayloadContractVerifyAsUnknownEvents()
        {
            JsonObject message = Notification("notification.message"), call = Notification("notification.call");
            JsonObject cancelled = Notification("notification.callCancelled");
            string messageId = (string)message["messageId"]!, liveSessionId = (string)call["liveSessionId"]!;
            JsonObject Subject(string id, string kind) => new JsonObject { ["id"] = id, ["kind"] = kind };
            var malformed = new List<JsonObject>
            {
                Js.With(message, new JsonObject { ["subjectRef"] = Subject(Fixtures.NewId(), "message") }),
                Js.With(message, new JsonObject { ["subjectRef"] = Subject(messageId, "liveSession") }),
                Js.With(call, new JsonObject { ["subjectRef"] = Subject(liveSessionId, "message") }),
                Js.With(message, new JsonObject { ["recipientId"] = ((string)message["recipientId"]!).ToUpperInvariant() }),
                Js.With(message, new JsonObject { ["senderId"] = "00000000-0000-0000-0000-000000000000" }),
                Js.Without(message, "conversationId"),
                Js.With(message, new JsonObject { ["connected"] = "false" }),
                Js.With(message, new JsonObject { ["preview"] = null }),
                Js.With(message, new JsonObject { ["preview"] = new JsonObject { ["text"] = "hi" } }),
                Js.With(message, new JsonObject { ["preview"] = new JsonObject { ["text"] = "", ["truncated"] = false } }),
                Js.With(message, new JsonObject { ["preview"] = new JsonObject { ["text"] = new string('x', 513), ["truncated"] = true } }),
                Js.With(message, new JsonObject { ["preview"] = new JsonObject { ["text"] = "a\uD800", ["truncated"] = false } }),
                Js.With(message, new JsonObject { ["occurredAt"] = "2026-10-10t12:00:00z" }),
                Js.With(message, new JsonObject { ["occurredAt"] = "2026-02-29T00:00:00Z" }),
                Js.With(message, new JsonObject { ["occurredAt"] = "2026-10-10T12:00:00.1234567890Z" }),
                Js.With(call, new JsonObject { ["expiresAt"] = "2026-10-10T23:59:60Z" }),
                Js.With(call, new JsonObject { ["mediaProfile"] = "audio-video" }),
                Js.With(call, new JsonObject { ["mediaProfile"] = "A" + new string('b', 64) }),
                Js.Without(call, "alertId"),
                Js.With(cancelled, new JsonObject { ["reason"] = "" }),
                Js.Without(cancelled, "reason"),
                Js.With(call, new JsonObject { ["eventType"] = "notification.callCancelled" }),
            };
            foreach (JsonObject value in malformed)
            {
                WebhookEvent verified = Verify(Js.Stringify(value)).Event;
                Assert.IsType<WebhookUnknownEvent>(verified);
                var expected = new JsonObject
                {
                    ["known"] = false, ["eventId"] = value["eventId"]!.DeepClone(), ["eventType"] = value["eventType"]!.DeepClone(),
                    ["occurredAt"] = value["occurredAt"]!.DeepClone(), ["projectId"] = value["projectId"]!.DeepClone(),
                    ["subjectRef"] = value["subjectRef"]!.DeepClone(),
                };
                Js.Equal(expected, Events.ToJson(verified), Js.Stringify(value));
            }

            // The envelope rules still apply first.
            foreach (JsonObject value in new[]
            {
                Js.With(message, new JsonObject { ["subjectRef"] = new JsonObject { ["id"] = messageId } }),
                Js.With(call, new JsonObject { ["projectId"] = "" }),
            })
            {
                Rejects(InvalidBody, () => Verify(Js.Stringify(value)));
            }
        }

        [Fact]
        public void TamperingWithTheBodyIdOrTimestampFailsTheSignature()
        {
            string body = Js.Stringify(Envelope());
            Dictionary<string, string> signed = Signed(body);
            Rejects(NoMatchingSignature, () => Verify(body.Replace("message.created", "message.deleted"), signed));
            // The same JSON value, re-serialized, is a different body.
            string reserialized = JsonNode.Parse(body)!.ToJsonString(new JsonSerializerOptions { WriteIndented = true });
            Rejects(NoMatchingSignature, () => Verify(reserialized, signed));
            Rejects(NoMatchingSignature, () => Verify(body, With(signed, "webhook-id", Fixtures.NewId())));
            Rejects(NoMatchingSignature, () => Verify(body, With(signed, "webhook-timestamp", Stamp(Timestamp + 1))));
            // The signed timestamp is the header text, not its numeric value.
            Rejects(NoMatchingSignature, () => Verify(body, With(signed, "webhook-timestamp", "0" + Stamp(Timestamp))));
            Rejects(NoMatchingSignature, () => Verify(body, signed, new[] { WebhookSigner.NewSecret() }));
        }

        [Fact]
        public void TimestampsPassWithinTheToleranceInclusiveAndFailOutsideItWithADirection()
        {
            string body = Js.Stringify(Envelope());
            foreach ((long offset, WebhookVerificationCode? code) in new (long, WebhookVerificationCode?)[]
            {
                (-300, null), (300, null), (-301, TimestampExpired), (301, TimestampFuture),
            })
            {
                Dictionary<string, string> headers = Signed(body, at: Timestamp + offset);
                if (code is WebhookVerificationCode expected) Rejects(expected, () => Verify(body, headers));
                else Assert.Equal(Timestamp + offset, Verify(body, headers).Timestamp);
            }

            // The clock is compared in whole seconds.
            Verify(body, Signed(body, at: Timestamp - 300), now: Now.AddMilliseconds(999));
            Verify(body, tolerance: 0);
            Rejects(TimestampExpired, () => Verify(body, Signed(body, at: Timestamp - 1), tolerance: 0));
            Verify(body, Signed(body, at: Timestamp + 3600), tolerance: 3600);
            long fresh = DateTimeOffset.UtcNow.ToUnixTimeSeconds();
            Assert.Equal(fresh, Webhooks.Verify(WebhookHeaders.From(Signed(body, at: fresh)), body, new[] { Current }).Timestamp);
            // Timestamps are checked before signatures.
            Rejects(TimestampExpired, () => Verify(body, Signed(body, at: Timestamp - 301), new[] { WebhookSigner.NewSecret() }));
            Dictionary<string, string> signed = Signed(body);
            foreach (string stamp in new[] { "-1", "1.5", "1e9", " 1", "0x10", "1234567890123456", "１２３" })
                Rejects(InvalidTimestamp, () => Verify(body, With(signed, "webhook-timestamp", stamp)));
        }

        [Fact]
        public void DuringARotationAnyHeldSecretVerifiesWhateverOrderTheEntriesArriveIn()
        {
            string body = Js.Stringify(Envelope());
            // The sender signs with the current secret, then the next one (at most 5 minutes) or the replaced one (24 hours).
            foreach (string[] signers in new[] { new[] { Current, Next }, new[] { Current, Replaced }, new[] { Current, Next, Replaced } })
            {
                Dictionary<string, string> headers = Signed(body, signers);
                foreach (string held in signers) Assert.Equal(WebhookId, Verify(body, headers, new[] { held }).WebhookId);
                Verify(body, headers, new[] { WebhookSigner.NewSecret(), signers[signers.Length - 1] });
                Rejects(NoMatchingSignature, () => Verify(body, headers, new[] { WebhookSigner.NewSecret(), WebhookSigner.NewSecret() }));
            }
        }

        [Fact]
        public void NonV1AndMalformedEntriesAreIgnoredAndMoreThanEightEntriesAreRejected()
        {
            string body = Js.Stringify(Envelope());
            Dictionary<string, string> signed = Signed(body);
            string valid = signed["webhook-signature"], mac = valid.Substring("v1,".Length);
            string shortMac = Convert.ToBase64String(new byte[16]);
            string[] ignored =
            {
                "v2," + mac, "V1," + mac, "v1a," + mac, "," + mac, mac, "v1", "v1,", "v1,not*base64",
                "v1," + mac.Substring(0, mac.Length - 1), "v1," + mac + "x", "v1," + shortMac,
            };
            Dictionary<string, string> WithSignature(string value) => With(signed, "webhook-signature", value);
            foreach (string entry in ignored) Rejects(NoMatchingSignature, () => Verify(body, WithSignature(entry)));
            Verify(body, WithSignature(string.Join(" ", ignored.Take(7).Append(valid))));
            Verify(body, WithSignature("  " + valid + "  " + ignored[0] + " "));
            Rejects(TooManySignatures, () => Verify(body, WithSignature(string.Join(" ", ignored.Take(8).Append(valid)))));
            Rejects(TooManySignatures, () => Verify(body, WithSignature(string.Join(" ", Enumerable.Repeat(valid, 9)))));
        }

        [Fact]
        public void HeaderNamesMatchCaseInsensitivelyAndMissingEmptyOrRepeatedHeadersAreRejected()
        {
            string body = Js.Stringify(Envelope());
            Dictionary<string, string> headers = Signed(body);
            var mixed = new Dictionary<string, string>
            {
                ["Webhook-Id"] = headers["webhook-id"],
                ["WEBHOOK-TIMESTAMP"] = headers["webhook-timestamp"],
                ["webhook-Signature"] = headers["webhook-signature"],
            };
            VerifiedWebhookDelivery verified = Verify(body, headers);
            AssertSameDelivery(verified, Verify(body, mixed));
            using (var message = new HttpRequestMessage())
            {
                foreach (KeyValuePair<string, string> header in mixed) Assert.True(message.Headers.TryAddWithoutValidation(header.Key, header.Value));
                AssertSameDelivery(verified, VerifyWith(WebhookHeaders.From(message.Headers), body));
                // A Fetch-style lookup, such as Headers.get.
                AssertSameDelivery(verified, VerifyWith(WebhookHeaders.From(name =>
                    message.Headers.TryGetValues(name, out IEnumerable<string>? values) ? string.Join(", ", values) : null), body));
            }

            // Multi-value collections, like ASP.NET Core's IHeaderDictionary, may hold a single value as a one-element array.
            Dictionary<string, string[]> arrays = headers.ToDictionary(header => header.Key, header => new[] { header.Value });
            AssertSameDelivery(verified, VerifyWith(WebhookHeaders.From(arrays), body));
            Rejects(InvalidHeader, () => Verify(body, With(headers, "Webhook-Id", headers["webhook-id"])));
            var repeated = new Dictionary<string, string[]>(arrays)
            {
                ["webhook-signature"] = new[] { headers["webhook-signature"], headers["webhook-signature"] },
            };
            Rejects(InvalidHeader, () => VerifyWith(WebhookHeaders.From(repeated), body));
            foreach (string name in headers.Keys)
            {
                Dictionary<string, string> rest = headers.Where(header => header.Key != name).ToDictionary(header => header.Key, header => header.Value);
                Rejects(MissingHeader, () => Verify(body, rest));
                using (var without = new HttpRequestMessage())
                {
                    foreach (KeyValuePair<string, string> header in rest) without.Headers.TryAddWithoutValidation(header.Key, header.Value);
                    Rejects(MissingHeader, () => VerifyWith(WebhookHeaders.From(without.Headers), body));
                    Rejects(MissingHeader, () => VerifyWith(WebhookHeaders.From(lookup =>
                        without.Headers.TryGetValues(lookup, out IEnumerable<string>? values) ? string.Join(", ", values) : null), body));
                }

                Rejects(MissingHeader, () => Verify(body, With(headers, name, "")));
                Dictionary<string, string?> absent = headers.ToDictionary(header => header.Key, header => (string?)header.Value);
                absent[name] = null;
                Rejects(MissingHeader, () => VerifyWith(WebhookHeaders.From(absent!), body));
                var empty = new Dictionary<string, string[]>(arrays) { [name] = Array.Empty<string>() };
                Rejects(MissingHeader, () => VerifyWith(WebhookHeaders.From(empty), body));
            }
        }

        [Fact]
        public void StringAndByteBodiesAreVerifiedAsTheSameBytes()
        {
            string body = Js.Stringify(Envelope(new JsonObject { ["note"] = "Grüße, 世界 👋" }));
            byte[] bytes = Encoding.UTF8.GetBytes(body);
            Dictionary<string, string> signed = Signed(body);
            VerifiedWebhookDelivery verified = Verify(body, signed);
            AssertSameDelivery(verified, Webhooks.Verify(WebhookHeaders.From(signed), bytes, new[] { Current }, now: Now));
            var framed = new byte[bytes.Length + 8];
            Buffer.BlockCopy(bytes, 0, framed, 4, bytes.Length);
            AssertSameDelivery(verified,
                Webhooks.Verify(WebhookHeaders.From(signed), new ReadOnlySpan<byte>(framed, 4, bytes.Length), new[] { Current }, now: Now));
            Rejects(NoMatchingSignature, () => Verify(Encoding.Latin1.GetString(bytes), signed));
            // Correctly signed bytes that are not UTF-8 pass the signature check but are not an event.
            byte[] invalid = { 0x7b, 0xff, 0x7d };
            Dictionary<string, string> invalidHeaders = Signed(invalid);
            AssertSignature(WebhookId, Timestamp, Webhooks.VerifySignature(WebhookHeaders.From(invalidHeaders), invalid, new[] { Current }, now: Now));
            Rejects(InvalidBody, () => Webhooks.Verify(WebhookHeaders.From(invalidHeaders), invalid, new[] { Current }, now: Now));
        }

        [Fact]
        public void BodiesOver4096BytesAndBodiesThatAreNotEventEnvelopesAreRejected()
        {
            string Sized(int bytes)
            {
                string baseline = Js.Stringify(Envelope(new JsonObject { ["pad"] = "" }));
                return baseline.Replace("\"pad\":\"\"", "\"pad\":\"" + new string('x', bytes - baseline.Length) + "\"");
            }

            string limit = Sized(4096), over = Sized(4097);
            Assert.Equal(4096, Js.Bytes(limit));
            Verify(limit);
            Rejects(BodyTooLarge, () => Verify(over));
            Rejects(BodyTooLarge, () => Webhooks.Verify(WebhookHeaders.From(Signed(over)), Encoding.UTF8.GetBytes(over), new[] { Current }, now: Now));
            string wide = Js.Stringify(Envelope(new JsonObject { ["pad"] = new string('é', 2100) }));
            Assert.True(wide.Length <= 4096 && Js.Bytes(wide) > 4096);
            Rejects(BodyTooLarge, () => Verify(wide));
            foreach (string body in new[]
            {
                "not json", "[]", "null", "\"text\"",
                Js.Stringify(Envelope(new JsonObject { ["subjectRef"] = null })),
                Js.Stringify(Envelope(new JsonObject { ["subjectRef"] = new JsonObject { ["id"] = Fixtures.NewId() } })),
                Js.Stringify(Envelope(new JsonObject { ["eventId"] = "" })),
                Js.Stringify(Envelope(new JsonObject { ["eventType"] = 7 })),
                Js.Stringify(Js.Without(Envelope(), "projectId")),
            })
            {
                AssertSignature(WebhookId, Timestamp, VerifyWith(WebhookHeaders.From(Signed(body)), body, signatureOnly: true));
                Rejects(InvalidBody, () => Verify(body));
            }
        }

        [Fact]
        public void MalformedSecretsAreConfigurationErrorsReportedBeforeTheDeliveryIsRead()
        {
            string body = Js.Stringify(Envelope()), encoded = Current.Substring(WebhookSigner.Prefix.Length);
            // A 32-byte secret's Base64 ends in one pad character, and the character before it has two zero low bits.
            const string alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
            string nonCanonical = WebhookSigner.Prefix + encoded.Substring(0, encoded.Length - 2) +
                alphabet[alphabet.IndexOf(encoded[encoded.Length - 2]) | 1] + "=";
            Assert.Equal(Convert.FromBase64String(encoded), Convert.FromBase64String(nonCanonical.Substring(WebhookSigner.Prefix.Length)));
            var invalid = new List<string[]>
            {
                Array.Empty<string>(), new[] { "" }, new[] { "whsec_" }, new[] { encoded }, new[] { "whsec_not*base64" },
                new[] { "whsec_YQ" }, new[] { "whsec_YR==" }, new[] { nonCanonical }, new[] { Current.Substring(0, Current.Length - 1) },
                new[] { " " + Current }, new[] { Current + " " }, new[] { "WHSEC_" + encoded }, new[] { Current, "whsec_" },
                new[] { Current, null! },
            };
            invalid.AddRange(new[] { 1, 13, 23, 65 }.Select(size => new[] { WebhookSigner.NewSecret(size) }));
            foreach (string[] secrets in invalid) Rejects(InvalidSecret, () => Verify(body, Signed(body), secrets));
            Rejects(InvalidSecret, () => Webhooks.Verify(WebhookHeaders.From(new Dictionary<string, string>()), body, new[] { "whsec_" }, now: Now));
            Assert.Throws<ArgumentNullException>(() => Webhooks.Verify(WebhookHeaders.From(Signed(body)), body, null!, now: Now));
            // Standard Webhooks secrets are 24 to 64 bytes; ConvoHop issues 32-byte secrets.
            foreach (int size in new[] { 24, 32, 64 })
            {
                string secret = WebhookSigner.NewSecret(size);
                Verify(body, Signed(body, new[] { secret }), new[] { secret });
            }
        }

        [Fact]
        public void FailuresNeverEchoSecretsSignaturesOrTheBody()
        {
            const string marker = "body-marker-7d1c";
            string body = Js.Stringify(Envelope(new JsonObject { ["eventId"] = "", ["note"] = marker }));
            Dictionary<string, string> signed = Signed(body);
            string secretText = Current.Substring(WebhookSigner.Prefix.Length), mac = signed["webhook-signature"].Substring("v1,".Length);
            var attempts = new Func<object>[]
            {
                () => Verify(body, signed),
                () => Verify(body, signed, new[] { WebhookSigner.NewSecret() }),
                () => Verify(body, signed, new[] { WebhookSigner.Prefix + secretText + "!" }),
                () => Verify(body, With(signed, "webhook-signature", string.Join(" ", Enumerable.Repeat("v1," + mac, 9)))),
                () => Verify(body, With(signed, "webhook-timestamp", Stamp(Timestamp) + marker)),
            };
            List<WebhookVerificationException> errors = attempts.Select(attempt => Assert.Throws<WebhookVerificationException>(attempt)).ToList();
            Assert.Equal(new[] { InvalidBody, NoMatchingSignature, InvalidSecret, TooManySignatures, InvalidTimestamp },
                errors.Select(error => error.Code));
            foreach (WebhookVerificationException error in errors)
            {
                foreach (string secret in new[] { secretText, mac, marker })
                {
                    Assert.DoesNotContain(secret, error.Message, StringComparison.Ordinal);
                    Assert.DoesNotContain(secret, error.ToString(), StringComparison.Ordinal);
                }
            }
        }

        [Fact]
        public void InvalidArgumentsThrowArgumentExceptionsNotVerificationFailures()
        {
            string body = Js.Stringify(Envelope());
            Dictionary<string, string> signed = Signed(body);
            foreach (long tolerance in new[] { -1, long.MinValue, 9007199254740992, long.MaxValue })
                Assert.Throws<ArgumentOutOfRangeException>(() => Verify(body, signed, tolerance: tolerance));
            Verify(body, signed, tolerance: 9007199254740991);
            Assert.Throws<ArgumentNullException>(() => Webhooks.Verify(WebhookHeaders.From(signed), (string)null!, new[] { Current }, now: Now));
            Assert.Throws<ArgumentNullException>(() =>
                Webhooks.VerifySignature(WebhookHeaders.From(signed), (string)null!, new[] { Current }, now: Now));
            Assert.Throws<ArgumentNullException>(() => Webhooks.Verify(null!, body, new[] { Current }, now: Now));
            Assert.Throws<ArgumentNullException>(() => WebhookHeaders.From((IEnumerable<KeyValuePair<string, string>>)null!));
            Assert.Throws<ArgumentNullException>(() => WebhookHeaders.From((IEnumerable<KeyValuePair<string, string[]>>)null!));
            Assert.Throws<ArgumentNullException>(() => WebhookHeaders.From((Func<string, string?>)null!));
        }

        private static string Stamp(long value) => value.ToString(CultureInfo.InvariantCulture);

        private static JsonObject Envelope(JsonObject? fields = null)
        {
            var envelope = new JsonObject
            {
                ["eventId"] = Fixtures.NewId(),
                ["eventType"] = "message.created",
                ["occurredAt"] = Fixtures.Iso(Now),
                ["projectId"] = Fixtures.NewId(),
                ["subjectRef"] = new JsonObject { ["id"] = Fixtures.NewId(), ["kind"] = "message" },
            };
            return fields == null ? envelope : Js.With(envelope, fields);
        }

        /// <summary>A notification event under the push payload contract (spec/push-payload/).</summary>
        private static JsonObject Notification(string eventType, JsonObject? fields = null)
        {
            var value = new JsonObject
            {
                ["eventId"] = Fixtures.NewId(), ["eventType"] = eventType, ["occurredAt"] = Fixtures.Iso(Now),
                ["projectId"] = Fixtures.NewId(), ["recipientId"] = Fixtures.NewId(), ["conversationId"] = Fixtures.NewId(),
                ["senderId"] = Fixtures.NewId(), ["connected"] = false,
            };
            if (eventType == "notification.message")
            {
                string messageId = Fixtures.NewId();
                value["subjectRef"] = new JsonObject { ["id"] = messageId, ["kind"] = "message" };
                value["messageId"] = messageId;
            }
            else
            {
                string liveSessionId = Fixtures.NewId();
                value["subjectRef"] = new JsonObject { ["id"] = liveSessionId, ["kind"] = "liveSession" };
                value["liveSessionId"] = liveSessionId;
                value["alertId"] = Fixtures.NewId();
                value["expiresAt"] = Fixtures.Iso(Now.AddSeconds(45));
                value["mediaProfile"] = "AUDIO_VIDEO";
                if (eventType == "notification.callCancelled") value["reason"] = "answered";
            }

            return fields == null ? value : Js.With(value, fields);
        }

        private static Dictionary<string, string> Signed(byte[] body, string[]? signers = null, string? id = null, long? at = null)
        {
            string webhookId = id ?? WebhookId, stamp = Stamp(at ?? Timestamp);
            return new Dictionary<string, string>
            {
                ["webhook-id"] = webhookId,
                ["webhook-timestamp"] = stamp,
                ["webhook-signature"] = string.Join(" ", (signers ?? new[] { Current })
                    .Select(secret => WebhookSigner.Sign(secret, webhookId, stamp, body))),
            };
        }

        private static Dictionary<string, string> Signed(string body, string[]? signers = null, string? id = null, long? at = null) =>
            Signed(Encoding.UTF8.GetBytes(body), signers, id, at);

        private static Dictionary<string, string> With(Dictionary<string, string> headers, string name, string value) =>
            new Dictionary<string, string>(headers) { [name] = value };

        private static VerifiedWebhookDelivery Verify(
            string body, Dictionary<string, string>? headers = null, string[]? secrets = null,
            long tolerance = Webhooks.DefaultToleranceSeconds, DateTimeOffset? now = null) =>
            Webhooks.Verify(WebhookHeaders.From(headers ?? Signed(body)), body, secrets ?? new[] { Current }, tolerance, now ?? Now);

        private static WebhookSignature VerifyWith(WebhookHeaders headers, string body, bool signatureOnly = false) =>
            signatureOnly
                ? Webhooks.VerifySignature(headers, body, new[] { Current }, now: Now)
                : Webhooks.Verify(headers, body, new[] { Current }, now: Now);

        private static void Rejects(WebhookVerificationCode code, Action action)
        {
            WebhookVerificationException error = Assert.Throws<WebhookVerificationException>(action);
            Assert.Equal(code, error.Code);
        }

        private static void AssertSignature(string webhookId, long timestamp, WebhookSignature signature)
        {
            Assert.IsType<WebhookSignature>(signature);
            Assert.Equal(webhookId, signature.WebhookId);
            Assert.Equal(timestamp, signature.Timestamp);
        }

        private static void AssertSameDelivery(VerifiedWebhookDelivery expected, WebhookSignature actual)
        {
            VerifiedWebhookDelivery delivery = Assert.IsType<VerifiedWebhookDelivery>(actual);
            Assert.Equal(expected.WebhookId, delivery.WebhookId);
            Assert.Equal(expected.Timestamp, delivery.Timestamp);
            Js.Equal(Events.ToJson(expected.Event), Events.ToJson(delivery.Event));
        }
    }
}
