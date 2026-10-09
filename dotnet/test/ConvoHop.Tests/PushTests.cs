using System;
using System.Collections.Generic;
using System.Globalization;
using System.Linq;
using System.Reflection;
using System.Text.Json;
using System.Text.Json.Nodes;
using ConvoHop.Tests.TestSupport;
using Xunit;

namespace ConvoHop.Tests
{
    public sealed class PushTests
    {
        // Expected requests are written out from spec/push-payload/README.md, independently of the builders and the vectors.
        private const string Bundle = "com.example.chat", Ellipsis = "\u2026";
        private const long NowSeconds = 1_791_633_600, Day = 86_400, Cap = 2_419_200;
        private const string EventId = "5b0c1d2e-3f40-4152-8637-48596a7b8c9d", ProjectId = "7e8f9a0b-1c2d-4e3f-9051-627384950a1b";
        private const string RecipientId = "9a8b7c6d-5e4f-4031-a2b3-c4d5e6f70819", ConversationId = "2c3d4e5f-6071-4829-b3a4-b5c6d7e8f901";
        private const string SenderId = "3d4e5f60-7182-4930-84a5-b6c7d8e9f012", MessageId = "4e5f6071-8293-4a41-95b6-c7d8e9f01223";
        private const string LiveSessionId = "5f607182-93a4-4b52-a6c7-d8e9f0122334", AlertId = "60718293-a4b5-4c63-b7d8-e9f012233445";
        private const string Collapse = "60718293a4b54c63b7d8e9f012233445";
        private static readonly DateTimeOffset Now = DateTimeOffset.FromUnixTimeSeconds(NowSeconds);
        private static readonly string[] Builders = { "apnsAlert", "apnsVoip", "fcm", "webPush" };
        private static readonly Dictionary<string, int> Limits = new Dictionary<string, int>
        {
            ["apnsAlert"] = 4096, ["apnsVoip"] = 5120, ["fcm"] = 4096, ["webPush"] = 3993,
        };

        public static IEnumerable<object[]> VectorIds() => SharedIds("vectors");

        public static IEnumerable<object[]> InvalidEventIds() => SharedIds("invalidEvents");

        [Theory]
        [MemberData(nameof(VectorIds))]
        public void TheSharedVectorsGiveTheTypeScriptBuildersRequestsByteForByte(string id)
        {
            JsonNode vector = Shared("vectors", id);
            JsonObject options = vector["options"]!.AsObject();
            Assert.Empty(options.Select(option => option.Key).Except(new[] { "bundleId", "title", "body", "preview" }));
            var opts = new Opts(Js.Text(options, "title"), Js.Text(options, "body"), options["preview"] is JsonNode preview ? (bool)preview : true,
                DateTimeOffset.FromUnixTimeSeconds((long)vector["nowSeconds"]!), Js.Text(options, "bundleId"));
            JsonObject input = vector["unknownFields"] is JsonObject unknown ? Js.With(vector["event"]!.AsObject(), unknown) : vector["event"]!.AsObject();
            var typed = Assert.IsAssignableFrom<WebhookNotificationEvent>(Events.Parse(input));
            foreach (string name in Builders)
            {
                JsonNode? expected = vector["expected"]![name];
                JsonObject? request = Build(name, input, opts), viaTyped = BuildTyped(name, typed, opts);
                Assert.Equal(Js.Stringify(request), Js.Stringify(viaTyped));
                if (expected == null)
                {
                    Assert.Null(request);
                    continue;
                }

                Assert.True(request != null, name + " returned no request");
                Assert.Equal(Js.Stringify(expected["request"]), Js.Stringify(request));
                Assert.Equal((int)expected["bytes"]!, Js.Size(name == "fcm" ? request!["message"]!["data"] : request!["payload"]));
            }
        }

        [Theory]
        [MemberData(nameof(InvalidEventIds))]
        public void TheSharedInvalidEventsAreRejectedAndVerifyAsUnknownWebhookEvents(string id)
        {
            JsonNode @event = Shared("invalidEvents", id)["event"]!;
            foreach (string name in Builders) Rejects(PushPayloadCode.InvalidEvent, () => Build(name, @event));
            Assert.IsType<WebhookUnknownEvent>(Events.Parse(@event));
        }

        [Fact]
        public void AMessageBuildsAnAlertAnFcmDataMessageAndAWebPushMessageMetadataOnlyByDefault()
        {
            JsonObject @event = MessageEvent();
            const long ttl = Day - 60;
            Js.Equal(new JsonObject
            {
                ["headers"] = new JsonObject
                {
                    ["apns-push-type"] = "alert", ["apns-topic"] = Bundle, ["apns-priority"] = "10", ["apns-expiration"] = Text(NowSeconds + ttl),
                },
                ["payload"] = ApnsPayload(new JsonObject { ["loc-key"] = "CONVOHOP_MESSAGE" }, MessageData()),
            }, Build("apnsAlert", @event));
            Assert.Null(Build("apnsVoip", @event));
            JsonObject fcm = Build("fcm", @event)!;
            Js.Equal(new JsonObject
            {
                ["message"] = new JsonObject
                {
                    ["data"] = new JsonObject { ["convohop"] = fcm["message"]!["data"]!["convohop"]!.DeepClone() },
                    ["android"] = new JsonObject { ["priority"] = "HIGH", ["ttl"] = Text(ttl) + "s" },
                },
            }, fcm);
            Js.Equal(MessageData(), FcmData(fcm));
            Js.Equal(new JsonObject
            {
                ["headers"] = new JsonObject { ["TTL"] = Text(ttl), ["Urgency"] = "normal" },
                ["payload"] = new JsonObject { ["convohop"] = MessageData() },
            }, Build("webPush", @event));
        }

        [Fact]
        public void AnOptedInPreviewBecomesTheBodyAndTitleAndBodyOptionsAddVisibleText()
        {
            JsonObject @event = MessageEvent(new JsonObject { ["preview"] = new JsonObject { ["text"] = "See you at 6", ["truncated"] = true } });
            void Alert(Opts options, JsonObject expected) =>
                Js.Equal(ApnsPayload(expected, MessageData()), Build("apnsAlert", @event, options)!["payload"]);
            Alert(new Opts(Title: "Ada"), new JsonObject { ["title"] = "Ada", ["body"] = "See you at 6…" });
            Alert(new Opts(Title: "", Body: ""), new JsonObject { ["body"] = "See you at 6…" });
            Alert(new Opts(Body: "New message"), new JsonObject { ["body"] = "New message" });
            Alert(new Opts(Title: "Ada", Preview: false), new JsonObject { ["title"] = "Ada", ["loc-key"] = "CONVOHOP_MESSAGE" });
            JsonObject done = MessageEvent(new JsonObject { ["preview"] = new JsonObject { ["text"] = "Done", ["truncated"] = false } });
            Js.Equal(new JsonObject { ["body"] = "Done" }, Build("apnsAlert", done)!["payload"]!["aps"]!["alert"]);
            Js.Equal(MessageData(new JsonObject { ["title"] = "Ada", ["body"] = "See you at 6…" }), FcmData(Build("fcm", @event, new Opts(Title: "Ada"))!));
            Js.Equal(MessageData(new JsonObject { ["body"] = "New message" }),
                Build("webPush", @event, new Opts(Body: "New message"))!["payload"]!["convohop"]);
            foreach (string name in new[] { "apnsAlert", "fcm", "webPush" })
            {
                JsonObject request = Build(name, @event, new Opts(Preview: false))!;
                (string? title, string? body) = Visible(name, request);
                Assert.Null(title);
                Assert.Null(body);
                Assert.DoesNotContain("See you", Js.Stringify(request), StringComparison.Ordinal);
            }
        }

        [Fact]
        public void AnIncomingCallBuildsAVoipPushAnAlertAndHighPriorityDataMessagesThatCollapseOnTheRing()
        {
            JsonObject @event = CallEvent();
            string expiration = Text(NowSeconds + 40);
            var ada = new Opts(Title: "Ada");
            Js.Equal(new JsonObject
            {
                ["headers"] = new JsonObject
                {
                    ["apns-push-type"] = "alert", ["apns-topic"] = Bundle, ["apns-priority"] = "10", ["apns-expiration"] = expiration,
                    ["apns-collapse-id"] = Collapse,
                },
                ["payload"] = ApnsPayload(new JsonObject { ["title"] = "Ada", ["loc-key"] = "CONVOHOP_CALL" }, CallData()),
            }, Build("apnsAlert", @event, ada));
            Js.Equal(new JsonObject
            {
                ["headers"] = new JsonObject
                {
                    ["apns-push-type"] = "voip", ["apns-topic"] = Bundle + ".voip", ["apns-priority"] = "10", ["apns-expiration"] = expiration,
                },
                ["payload"] = new JsonObject { ["convohop"] = CallData(new JsonObject { ["title"] = "Ada" }) },
            }, Build("apnsVoip", @event, ada));
            JsonObject fcm = Build("fcm", @event, ada)!;
            Js.Equal(new JsonObject { ["priority"] = "HIGH", ["ttl"] = "40s", ["collapse_key"] = Collapse }, fcm["message"]!["android"]);
            Js.Equal(CallData(new JsonObject { ["title"] = "Ada" }), FcmData(fcm));
            Js.Equal(new JsonObject
            {
                ["headers"] = new JsonObject { ["TTL"] = "40", ["Urgency"] = "high", ["Topic"] = Collapse },
                ["payload"] = new JsonObject { ["convohop"] = CallData(new JsonObject { ["title"] = "Ada" }) },
            }, Build("webPush", @event, ada));
            JsonObject audio = CallEvent(new JsonObject { ["mediaProfile"] = "AUDIO_ONLY", ["connected"] = true });
            Js.Equal(CallData(new JsonObject { ["mediaProfile"] = "AUDIO_ONLY" }), Build("apnsVoip", audio)!["payload"]!["convohop"]);
        }

        [Fact]
        public void AMissedCallReplacesTheRingsAlertAndOtherCancellationsReachOnlyTheDataChannels()
        {
            foreach (string reason in new[] { "ended", "expired" })
            {
                JsonObject @event = CancelEvent(reason, new JsonObject { ["occurredAt"] = At(-15) });
                const long ttl = Day - 15;
                JsonObject Data() => CallData(new JsonObject
                {
                    ["eventType"] = "notification.callCancelled", ["occurredAt"] = At(-15), ["reason"] = reason,
                });
                Js.Equal(new JsonObject
                {
                    ["headers"] = new JsonObject
                    {
                        ["apns-push-type"] = "alert", ["apns-topic"] = Bundle, ["apns-priority"] = "10",
                        ["apns-expiration"] = Text(NowSeconds + ttl), ["apns-collapse-id"] = Collapse,
                    },
                    ["payload"] = ApnsPayload(new JsonObject { ["loc-key"] = "CONVOHOP_MISSED_CALL" }, Data()),
                }, Build("apnsAlert", @event), reason);
                Assert.Null(Build("apnsVoip", @event));
                JsonObject fcm = Build("fcm", @event)!;
                Js.Equal(new JsonObject { ["priority"] = "HIGH", ["ttl"] = Text(ttl) + "s", ["collapse_key"] = Collapse },
                    fcm["message"]!["android"], reason);
                Js.Equal(Data(), FcmData(fcm), reason);
                Js.Equal(new JsonObject
                {
                    ["headers"] = new JsonObject { ["TTL"] = Text(ttl), ["Urgency"] = "high", ["Topic"] = Collapse },
                    ["payload"] = new JsonObject { ["convohop"] = Data() },
                }, Build("webPush", @event), reason);
            }

            // Answered, declined and later reasons only stop the ringing, so they live until the ring's deadline.
            foreach (string reason in new[] { "answered", "declined", "transferred" })
            {
                JsonObject @event = CancelEvent(reason, new JsonObject { ["occurredAt"] = At(-2) });
                JsonObject Data() => CallData(new JsonObject
                {
                    ["eventType"] = "notification.callCancelled", ["occurredAt"] = At(-2), ["reason"] = reason,
                });
                Assert.Null(Build("apnsAlert", @event));
                Assert.Null(Build("apnsVoip", @event));
                JsonObject fcm = Build("fcm", @event)!;
                Js.Equal(new JsonObject { ["priority"] = "HIGH", ["ttl"] = "40s", ["collapse_key"] = Collapse }, fcm["message"]!["android"], reason);
                Js.Equal(Data(), FcmData(fcm), reason);
                Js.Equal(new JsonObject
                {
                    ["headers"] = new JsonObject { ["TTL"] = "40", ["Urgency"] = "high", ["Topic"] = Collapse },
                    ["payload"] = new JsonObject { ["convohop"] = Data() },
                }, Build("webPush", @event), reason);
            }
        }

        [Fact]
        public void LifetimesCountWholeSecondsStopAt28DaysAndYieldNoRequestOnceStale()
        {
            // The lifetime every applicable builder gives the event, or null when none returns a request.
            long? Ttl(JsonObject @event, Opts? options = null)
            {
                long clock = (options?.Now ?? Now).ToUnixTimeSeconds();
                var ttls = new List<string>();
                foreach (string name in Builders)
                {
                    JsonObject? request = Build(name, @event, options);
                    if (request == null) continue;
                    if (request["message"] is JsonNode message)
                    {
                        string ttl = (string)message["android"]!["ttl"]!;
                        ttls.Add(ttl.Substring(0, ttl.Length - 1));
                        continue;
                    }

                    JsonNode headers = request["headers"]!;
                    ttls.Add(Js.Text(headers, "TTL") ??
                        Text(long.Parse(Js.Text(headers, "apns-expiration")!, NumberStyles.None, CultureInfo.InvariantCulture) - clock));
                }

                if (ttls.Count == 0) return null;
                Assert.True(ttls.Distinct().Count() == 1, string.Join(",", ttls));
                return long.Parse(ttls[0], NumberStyles.None, CultureInfo.InvariantCulture);
            }

            JsonObject Occurred(string at) => new JsonObject { ["occurredAt"] = at };
            JsonObject Expires(string at) => new JsonObject { ["expiresAt"] = at };
            Assert.Equal(1L, Ttl(MessageEvent(Occurred(At(-Day + 1)))));
            Assert.Null(Ttl(MessageEvent(Occurred(At(-Day)))));
            Assert.Null(Ttl(MessageEvent(Occurred(At(-Day - 1)))));
            // Fractions of the event times and of the clock are dropped.
            Assert.Equal(Day - 60, Ttl(MessageEvent(Occurred("2026-10-10T11:59:00.999999999Z"))));
            Assert.Equal(Day - 60, Ttl(MessageEvent(), new Opts(Now: Now.AddMilliseconds(999))));
            Assert.Equal(Day - 61, Ttl(MessageEvent(), new Opts(Now: Now.AddMilliseconds(1000))));
            Assert.Equal(Day - 60, Ttl(MessageEvent(Occurred("2026-10-10T13:59:00+02:00"))));
            Assert.Equal(Day - 60, Ttl(MessageEvent(Occurred("2026-10-10T06:29:00-05:30"))));
            Assert.Equal(1L, Ttl(CallEvent(Expires(At(1)))));
            Assert.Null(Ttl(CallEvent(Expires(At(0)))));
            Assert.Null(Ttl(CallEvent(Expires(At(0).Substring(0, At(0).Length - 1) + ".999Z"))));
            Assert.Null(Ttl(CancelEvent("answered", Expires(At(-1)))));
            Assert.Null(Ttl(CancelEvent("expired", Occurred(At(-Day)))));
            // A far deadline, or a producer clock ahead of yours, is capped.
            Assert.Equal(Cap, Ttl(CallEvent(Expires(At(40 * Day)))));
            Assert.Equal(Cap - 1, Ttl(CallEvent(Expires(At(Cap - 1)))));
            Assert.Equal(Cap, Ttl(MessageEvent(Occurred(At(30 * Day)))));
            Assert.Equal(Text(NowSeconds + Cap), Js.Text(Build("apnsVoip", CallEvent(Expires(At(40 * Day))))!["headers"], "apns-expiration"));
            // The default clock is the current time, and the options are optional where no bundle ID is needed.
            string current = DateTimeOffset.UtcNow.UtcDateTime.ToString("yyyy-MM-dd'T'HH:mm:ss.fff'Z'", CultureInfo.InvariantCulture);
            WebPushRequest fresh = PushPayloads.WebPush(Element(MessageEvent(Occurred(current))))!;
            Assert.InRange(fresh.TtlSeconds, Day - 2, Day);
            FcmRequest typed = PushPayloads.Fcm(Assert.IsAssignableFrom<WebhookNotificationEvent>(Events.Parse(MessageEvent(Occurred(current)))))!;
            Assert.InRange(typed.Android.TtlSeconds, Day - 2, Day);
        }

        [Fact]
        public void ARequestExactlyAtItsLimitIsKeptAndOneByteOverShortensTheBody()
        {
            foreach (string name in Builders)
            {
                JsonObject @event = name == "apnsVoip" ? CallEvent() : MessageEvent();
                int limit = Limits[name];
                JsonObject Request(string text) => Build(name, @event, new Opts(Title: "Ada", Body: text))!;
                int pad = limit - Js.Size(Measured(name, Request("x"))) + 1;
                string body = Js.Repeat("x", pad);
                JsonObject exact = Request(body);
                Assert.Equal(limit, Js.Size(Measured(name, exact)));
                Assert.Equal<(string?, string?)>(("Ada", body), Visible(name, exact));
                JsonObject over = Request(body + "y");
                Assert.Equal(limit, Js.Size(Measured(name, over)));
                Assert.Equal<(string?, string?)>(("Ada", Js.Repeat("x", pad - 3) + Ellipsis), Visible(name, over));
                // A preview that doesn't fit beside a long title is shortened like a body.
                if (name != "apnsVoip")
                {
                    string title = Js.Repeat("T", 700);
                    var preview = new JsonObject { ["text"] = Js.Repeat("\u0001", 512), ["truncated"] = false };
                    JsonObject previewed = Build(name, MessageEvent(new JsonObject { ["preview"] = preview }), new Opts(Title: title))!;
                    (string? shownTitle, string? shownBody) = Visible(name, previewed);
                    Assert.Equal(title, shownTitle);
                    Assert.Matches("^\u0001{1,511}\u2026\\z", shownBody);
                    Assert.True(Js.Size(Measured(name, previewed)) <= limit, name);
                    Assert.True(Js.Size(Measured(name, previewed, new JsonObject { ["body"] = "\u0001" + shownBody })) > limit,
                        name + " preview is not maximal");
                }
            }
        }

        [Fact]
        public void ShortenedTextKeepsWholeCodePointsAndTheLongestPrefixThatFits()
        {
            foreach (string name in Builders)
            {
                JsonObject @event = name == "apnsVoip" ? CallEvent() : MessageEvent();
                int limit = Limits[name];
                foreach (string unit in new[] { "é", "€", "👋", "\u0001", "\"", "\\", "\n", "a👋" })
                {
                    string full = Js.Repeat(unit, limit), label = name + " " + Js.Stringify(JsonValue.Create(unit));
                    JsonObject request = Build(name, @event, new Opts(Body: full))!;
                    string body = Visible(name, request).Body!, kept = body.Substring(0, body.Length - 1);
                    Assert.True(body.EndsWith(Ellipsis, StringComparison.Ordinal) && full.StartsWith(kept, StringComparison.Ordinal), label);
                    Assert.DoesNotContain(Js.CodePoints(body), point => point.Length == 1 && char.IsSurrogate(point[0]));
                    Assert.True(Js.Size(Measured(name, request)) <= limit, label);
                    string longer = string.Concat(Js.CodePoints(full).Take(Js.CodePoints(kept).Count + 1));
                    Assert.True(Js.Size(Measured(name, request, new JsonObject { ["body"] = longer + Ellipsis })) > limit,
                        label + " is not maximal");
                }
            }
        }

        [Fact]
        public void ATitleTooLongForAnyPayloadShortensTheBodyToAnEllipsisAndThenTheTitle()
        {
            string title = Js.Repeat("T", 6000);
            foreach (string name in Builders)
            {
                JsonObject @event = name == "apnsVoip" ? CallEvent() : MessageEvent();
                int limit = Limits[name];
                foreach (string? body in new string?[] { "hello", null })
                {
                    JsonObject request = Build(name, @event, new Opts(Title: title, Body: body))!;
                    (string? shownTitle, string? shownBody) = Visible(name, request);
                    Assert.Equal(body == null ? null : Ellipsis, shownBody);
                    Assert.Matches("^T+\u2026\\z", shownTitle);
                    Assert.True(Js.Size(Measured(name, request)) <= limit, name);
                    Assert.True(Js.Size(Measured(name, request, new JsonObject { ["title"] = "T" + shownTitle })) > limit,
                        name + " title is not maximal");
                }

                if (name == "apnsAlert")
                    Assert.Equal("CONVOHOP_MESSAGE", Js.Text(Build(name, @event, new Opts(Title: title))!["payload"]!["aps"]!["alert"], "loc-key"));
            }
        }

        [Fact]
        public void OptionsAreCheckedBeforeTheEventAndInvalidOnesFailWithInvalidOptions()
        {
            // C# types rule out JavaScript's wrong-typed options (null objects, numbers, strings for flags and clocks).
            JsonObject message = MessageEvent(), call = CallEvent();
            foreach (string name in Builders)
            {
                JsonObject target = name == "apnsVoip" ? call : message;
                foreach (Opts options in new[] { new Opts(Title: "\uD800"), new Opts(Body: "end\uDBFF"), new Opts(Title: "\uDC00start") })
                    Rejects(PushPayloadCode.InvalidOptions, () => Build(name, target, options));
                Rejects(PushPayloadCode.InvalidOptions, () => Build(name, new JsonObject(), new Opts(Body: "\uDFFF")));
                Rejects(PushPayloadCode.InvalidEvent, () => Build(name, new JsonObject()));
            }

            var typedMessage = (WebhookNotificationEvent)Events.Parse(message);
            var typedCall = (WebhookNotificationEvent)Events.Parse(call);
            Assert.Throws<ArgumentNullException>("options", () => PushPayloads.ApnsAlert(Element(message), null!));
            Assert.Throws<ArgumentNullException>("options", () => PushPayloads.ApnsAlert(typedMessage, null!));
            Assert.Throws<ArgumentNullException>("options", () => PushPayloads.ApnsVoip(Element(call), null!));
            Assert.Throws<ArgumentNullException>("options", () => PushPayloads.ApnsVoip(typedCall, null!));
            var apns = new ApnsPushOptions(Bundle) { Now = Now };
            Assert.Throws<ArgumentNullException>("notification", () => PushPayloads.ApnsAlert((WebhookNotificationEvent)null!, apns));
            Assert.Throws<ArgumentNullException>("notification", () => PushPayloads.ApnsVoip((WebhookNotificationEvent)null!, apns));
            Assert.Throws<ArgumentNullException>("notification", () => PushPayloads.Fcm((WebhookNotificationEvent)null!, apns));
            Assert.Throws<ArgumentNullException>("notification", () => PushPayloads.WebPush((WebhookNotificationEvent)null!));
            foreach (string name in new[] { "apnsAlert", "apnsVoip" })
            {
                JsonObject target = name == "apnsVoip" ? call : message;
                Rejects(PushPayloadCode.InvalidOptions, () => Build(name, target, new Opts(BundleId: null)));
                Rejects(PushPayloadCode.InvalidOptions, () => Build(name, new JsonObject(), new Opts(BundleId: "")));
                foreach (string bundleId in new[]
                {
                    "", "com..example", ".com.example", "com.example.", "com example", "com/example", "com_example", "com.exämple",
                    Js.Repeat("a", 156), "com.example\n", "com.\u0661",
                })
                {
                    Rejects(PushPayloadCode.InvalidOptions, () => Build(name, target, new Opts(BundleId: bundleId)));
                }

                foreach (string bundleId in new[] { Js.Repeat("a", 155), "com.example-app.Chat2", "A", "1.2" })
                {
                    Assert.Equal(name == "apnsVoip" ? bundleId + ".voip" : bundleId,
                        Js.Text(Build(name, target, new Opts(BundleId: bundleId))!["headers"], "apns-topic"));
                }
            }

            // Only the APNs builders use bundleId.
            foreach (string? bundleId in new[] { null, "com..example" })
            {
                var other = new ApnsPushOptions(bundleId!) { Now = Now };
                Assert.NotNull(PushPayloads.Fcm(Element(message), other));
                Assert.NotNull(PushPayloads.WebPush(typedMessage, other));
            }
        }

        [Fact]
        public void EventsOutsideThePushPayloadContractFailWithInvalidEventWithoutEchoingValues()
        {
            const string marker = "value-marker-4f2a";
            var invalid = new List<JsonElement> { default, Element(null), Element(JsonValue.Create("event")), Element(new JsonArray()), Element(new JsonObject()) };
            invalid.AddRange(new[]
            {
                Js.With(MessageEvent(), new JsonObject
                {
                    ["eventType"] = "message.created", ["subjectRef"] = new JsonObject { ["id"] = MessageId, ["kind"] = "message" },
                }),
                MessageEvent(new JsonObject { ["preview"] = new JsonObject { ["text"] = "a\uD800", ["truncated"] = false } }),
                MessageEvent(new JsonObject { ["preview"] = new JsonObject { ["text"] = Js.Repeat("x", 513), ["truncated"] = false } }),
                MessageEvent(new JsonObject { ["subjectRef"] = new JsonObject { ["id"] = LiveSessionId, ["kind"] = "message" } }),
                CallEvent(new JsonObject { ["alertId"] = AlertId.ToUpperInvariant() }),
                CallEvent(new JsonObject { ["expiresAt"] = "2026-02-29T00:00:00Z" }),
                CancelEvent(null),
                CancelEvent("answered", new JsonObject { ["reason"] = "not a reason" }),
                MessageEvent(new JsonObject { ["senderId"] = marker }),
                CallEvent(new JsonObject { ["mediaProfile"] = marker + "!" }),
            }.Select(@event => Element(@event)));
            foreach (string name in Builders)
            {
                foreach (JsonElement @event in invalid) Rejects(PushPayloadCode.InvalidEvent, () => Build(name, @event), marker);
                Rejects(PushPayloadCode.InvalidOptions, () => Build(name, MessageEvent(), new Opts(Title: marker + "\uD800")), marker);
            }
        }

        [Fact]
        public void BuildersTakeVerifiedWebhookEventsIgnoreUnknownFieldsAndConnectedAndDontMutateTheirInput()
        {
            JsonObject[] events =
            {
                MessageEvent(new JsonObject { ["preview"] = new JsonObject { ["text"] = "Grüße 👋", ["truncated"] = false } }),
                CallEvent(), CancelEvent("expired"), CancelEvent("declined"),
            };
            var shared = new ApnsPushOptions(Bundle) { Now = Now, Title = "Ada" };
            (ApnsPushOptions, PushOptions) options = (shared, shared);
            foreach (JsonObject @event in events)
            {
                string body = Js.Stringify(Js.With(@event, new JsonObject { ["addedLater"] = true }));
                WebhookEvent verified = Events.Deliver(body).Event;
                Assert.True(verified.Known);
                var typed = Assert.IsAssignableFrom<WebhookNotificationEvent>(verified);
                JsonElement element = Element(@event), changed = Element(Js.With(@event, new JsonObject
                {
                    ["connected"] = !(bool)@event["connected"]!, ["addedLater"] = new JsonObject { ["a"] = 1 },
                }));
                foreach (string name in Builders)
                {
                    JsonObject? expected = Run(name, element, options);
                    Js.Equal(expected, Run(name, typed, options), name);
                    Js.Equal(expected, Run(name, changed, options), name);
                    Js.Equal(expected, Run(name, element, options), name + " is not deterministic");
                }
            }

            Assert.Equal<(string, string?, string?, bool, DateTimeOffset?)>(
                (Bundle, "Ada", null, true, Now), (shared.BundleId, shared.Title, shared.Body, shared.Preview, shared.Now));
        }

        [Fact]
        public void PushPayloadsIsAStaticClassOfFourBuildersEachForTypedEventsAndEventJson()
        {
            Type type = typeof(PushPayloads);
            Assert.True(type.IsAbstract && type.IsSealed, "PushPayloads must be a static class");
            MethodInfo[] methods = type.GetMethods(BindingFlags.Public | BindingFlags.Static | BindingFlags.DeclaredOnly);
            Assert.Equal(new[] { "ApnsAlert", "ApnsVoip", "Fcm", "WebPush" },
                methods.Select(method => method.Name).Distinct().OrderBy(name => name, StringComparer.Ordinal));
            Assert.Equal(8, methods.Length);
            foreach (MethodInfo method in methods)
            {
                bool apns = method.Name.StartsWith("Apns", StringComparison.Ordinal);
                ParameterInfo[] parameters = method.GetParameters();
                Assert.Equal(2, parameters.Length);
                Assert.Contains(parameters[0].ParameterType, new[] { typeof(WebhookNotificationEvent), typeof(JsonElement) });
                Assert.Equal(apns ? typeof(ApnsPushOptions) : typeof(PushOptions), parameters[1].ParameterType);
                Assert.Equal(!apns, parameters[1].IsOptional);
                Assert.Equal(method.Name + "Request", method.ReturnType.Name);
            }

            Assert.Empty(type.GetFields(BindingFlags.Public | BindingFlags.Static));
            Assert.Empty(type.GetProperties(BindingFlags.Public | BindingFlags.Static));
            var error = new PushPayloadException(PushPayloadCode.InvalidEvent, "message");
            Assert.IsAssignableFrom<Exception>(error);
            Assert.Equal((PushPayloadCode.InvalidEvent, "message"), (error.Code, error.Message));
            Assert.Equal(new[] { "InvalidEvent", "InvalidOptions" }, Enum.GetNames(typeof(PushPayloadCode)));
        }

        private static IEnumerable<object[]> SharedIds(string list) =>
            Spec.Load("push-vectors.json")[list]!.AsArray().Select(vector => new object[] { (string)vector!["id"]! });

        private static JsonNode Shared(string list, string id) =>
            Spec.Load("push-vectors.json")[list]!.AsArray().Single(vector => (string?)vector!["id"] == id)!;

        private static string Text(long value) => value.ToString(CultureInfo.InvariantCulture);

        /// <summary>The RFC 3339 time <paramref name="offset"/> seconds after now.</summary>
        private static string At(long offset) =>
            DateTimeOffset.FromUnixTimeSeconds(NowSeconds + offset).UtcDateTime.ToString("yyyy-MM-dd'T'HH:mm:ss'Z'", CultureInfo.InvariantCulture);

        private static JsonObject Merge(JsonObject first, JsonObject second, JsonObject? fields) =>
            Js.With(Js.With(first, second), fields ?? new JsonObject());

        private static JsonObject Common() => new JsonObject
        {
            ["eventId"] = EventId, ["projectId"] = ProjectId, ["recipientId"] = RecipientId, ["conversationId"] = ConversationId,
            ["senderId"] = SenderId, ["connected"] = false,
        };

        private static JsonObject MessageEvent(JsonObject? fields = null) => Merge(Common(), new JsonObject
        {
            ["eventType"] = "notification.message", ["occurredAt"] = At(-60),
            ["subjectRef"] = new JsonObject { ["id"] = MessageId, ["kind"] = "message" }, ["messageId"] = MessageId,
        }, fields);

        private static JsonObject CallEvent(JsonObject? fields = null) => Merge(Common(), new JsonObject
        {
            ["eventType"] = "notification.call", ["occurredAt"] = At(-5),
            ["subjectRef"] = new JsonObject { ["id"] = LiveSessionId, ["kind"] = "liveSession" }, ["liveSessionId"] = LiveSessionId,
            ["alertId"] = AlertId, ["expiresAt"] = At(40), ["mediaProfile"] = "AUDIO_VIDEO",
        }, fields);

        private static JsonObject CancelEvent(string? reason, JsonObject? fields = null)
        {
            var cancel = new JsonObject { ["eventType"] = "notification.callCancelled" };
            if (reason != null) cancel["reason"] = reason;
            return CallEvent(Js.With(cancel, fields ?? new JsonObject()));
        }

        private static JsonObject Metadata() => new JsonObject
        {
            ["eventId"] = EventId, ["occurredAt"] = At(-60), ["projectId"] = ProjectId, ["recipientId"] = RecipientId,
            ["conversationId"] = ConversationId, ["senderId"] = SenderId,
        };

        private static JsonObject MessageData(JsonObject? fields = null) =>
            Merge(Metadata(), new JsonObject { ["eventType"] = "notification.message", ["messageId"] = MessageId }, fields);

        private static JsonObject CallData(JsonObject? fields = null) => Merge(Metadata(), new JsonObject
        {
            ["eventType"] = "notification.call", ["occurredAt"] = At(-5), ["liveSessionId"] = LiveSessionId, ["alertId"] = AlertId,
            ["expiresAt"] = At(40), ["mediaProfile"] = "AUDIO_VIDEO",
        }, fields);

        private static JsonObject ApnsPayload(JsonObject alert, JsonObject data) => new JsonObject
        {
            ["aps"] = new JsonObject { ["alert"] = alert, ["sound"] = "default", ["mutable-content"] = 1, ["thread-id"] = ConversationId },
            ["convohop"] = data,
        };

        private static JsonElement Element(JsonNode? value)
        {
            using (JsonDocument document = JsonDocument.Parse(Js.Stringify(value))) return document.RootElement.Clone();
        }

        /// <summary>A builder's request for the event's JSON, in the TypeScript builders' shape.</summary>
        private static JsonObject? Build(string name, JsonNode? @event, Opts? options = null) => Build(name, Element(@event), options);

        private static JsonObject? Build(string name, JsonElement @event, Opts? options = null) => Run(name, @event, Options(options));

        /// <summary>A builder's request for a typed event, as <c>Webhooks.Verify</c> returns it.</summary>
        private static JsonObject? BuildTyped(string name, WebhookNotificationEvent @event, Opts? options = null) =>
            Run(name, @event, Options(options));

        private static JsonObject? Run(string name, JsonElement @event, (ApnsPushOptions Apns, PushOptions Common) options)
        {
            switch (name)
            {
                case "apnsAlert": return Shape(PushPayloads.ApnsAlert(@event, options.Apns));
                case "apnsVoip": return Shape(PushPayloads.ApnsVoip(@event, options.Apns));
                case "fcm": return Shape(PushPayloads.Fcm(@event, options.Common));
                case "webPush": return Shape(PushPayloads.WebPush(@event, options.Common));
                default: throw new ArgumentOutOfRangeException(nameof(name), name, null);
            }
        }

        private static JsonObject? Run(string name, WebhookNotificationEvent @event, (ApnsPushOptions Apns, PushOptions Common) options)
        {
            switch (name)
            {
                case "apnsAlert": return Shape(PushPayloads.ApnsAlert(@event, options.Apns));
                case "apnsVoip": return Shape(PushPayloads.ApnsVoip(@event, options.Apns));
                case "fcm": return Shape(PushPayloads.Fcm(@event, options.Common));
                case "webPush": return Shape(PushPayloads.WebPush(@event, options.Common));
                default: throw new ArgumentOutOfRangeException(nameof(name), name, null);
            }
        }

        private static (ApnsPushOptions Apns, PushOptions Common) Options(Opts? options)
        {
            options ??= new Opts();
            DateTimeOffset? now = options.SystemClock ? null : options.Now ?? Now;
            return (new ApnsPushOptions(options.BundleId!) { Title = options.Title, Body = options.Body, Preview = options.Preview, Now = now },
                new PushOptions { Title = options.Title, Body = options.Body, Preview = options.Preview, Now = now });
        }

        private static JsonObject? Shape(ApnsAlertRequest? request)
        {
            if (request == null) return null;
            JsonObject payload = Parse(request.PayloadJson);
            JsonObject aps = payload["aps"]!.AsObject(), alert = aps["alert"]!.AsObject();
            Assert.Equal(request.Alert.Title, Js.Text(alert, "title"));
            Assert.Equal(request.Alert.Body, Js.Text(alert, "body"));
            Assert.Equal(request.Alert.LocKey, Js.Text(alert, "loc-key"));
            Assert.Equal(request.Sound, Js.Text(aps, "sound"));
            Assert.True(request.MutableContent);
            Assert.Equal(request.ThreadId, Js.Text(aps, "thread-id"));
            Assert.Null(request.Metadata.Title);
            Assert.Null(request.Metadata.Body);
            AssertMetadata(request.Metadata, payload["convohop"]);
            Assert.Equal(request.Headers["apns-topic"], request.Headers["APNS-TOPIC"]);
            return new JsonObject { ["headers"] = Headers(request.Headers), ["payload"] = payload };
        }

        private static JsonObject? Shape(ApnsVoipRequest? request)
        {
            if (request == null) return null;
            JsonObject payload = Parse(request.PayloadJson);
            AssertMetadata(request.Metadata, payload["convohop"]);
            return new JsonObject { ["headers"] = Headers(request.Headers), ["payload"] = payload };
        }

        private static JsonObject? Shape(FcmRequest? request)
        {
            if (request == null) return null;
            JsonObject message = Parse(request.MessageJson);
            Assert.Equal(new[] { "convohop" }, request.Data.Keys);
            Assert.Equal(request.Data["convohop"], Js.Text(message["data"], "convohop"));
            AssertMetadata(request.Metadata, Parse(request.Data["convohop"]));
            JsonObject android = message["android"]!.AsObject();
            Assert.Equal(request.Android.Priority, Js.Text(android, "priority"));
            Assert.Equal(request.Android.Ttl, Js.Text(android, "ttl"));
            Assert.Equal(Text(request.Android.TtlSeconds) + "s", request.Android.Ttl);
            Assert.Equal(request.Android.CollapseKey, Js.Text(android, "collapse_key"));
            return new JsonObject { ["message"] = message };
        }

        private static JsonObject? Shape(WebPushRequest? request)
        {
            if (request == null) return null;
            JsonObject payload = Parse(request.PayloadJson);
            Assert.Equal(Text(request.TtlSeconds), request.Headers["TTL"]);
            Assert.Equal(request.Urgency, request.Headers["Urgency"]);
            Assert.Equal(request.Topic, request.Headers.TryGetValue("topic", out string? topic) ? topic : null);
            AssertMetadata(request.Metadata, payload["convohop"]);
            return new JsonObject { ["headers"] = Headers(request.Headers), ["payload"] = payload };
        }

        /// <summary>Parses a request's JSON, which must be compact <c>JSON.stringify</c> output.</summary>
        private static JsonObject Parse(string raw)
        {
            JsonObject value = JsonNode.Parse(raw)!.AsObject();
            Assert.Equal(raw, Js.Stringify(value));
            return value;
        }

        private static JsonObject Headers(IReadOnlyDictionary<string, string> headers)
        {
            var result = new JsonObject();
            foreach (KeyValuePair<string, string> header in headers) result[header.Key] = header.Value;
            return result;
        }

        /// <summary>The typed metadata must say what its JSON says, in the contract's field order.</summary>
        private static void AssertMetadata(PushData data, JsonNode? json)
        {
            var typed = new JsonObject();
            foreach ((string name, string? value) in new[]
            {
                ("eventId", data.EventId), ("eventType", data.EventType), ("occurredAt", data.OccurredAt), ("projectId", data.ProjectId),
                ("recipientId", data.RecipientId), ("conversationId", data.ConversationId), ("senderId", data.SenderId),
                ("messageId", data.MessageId), ("liveSessionId", data.LiveSessionId), ("alertId", data.AlertId),
                ("expiresAt", data.ExpiresAt), ("mediaProfile", data.MediaProfile), ("reason", data.Reason), ("title", data.Title),
                ("body", data.Body),
            })
            {
                if (value != null) typed[name] = value;
            }

            Assert.Equal(Js.Stringify(typed), data.ToJson());
            Assert.Equal(data.ToJson(), Js.Stringify(json));
        }

        /// <summary>FCM's <c>data.convohop</c>, checked to be compact JSON.</summary>
        private static JsonObject FcmData(JsonObject request) => Parse((string)request["message"]!["data"]!["convohop"]!);

        /// <summary>The visible title and body: the APNs alert's, or the ones in <c>convohop</c>.</summary>
        private static (string? Title, string? Body) Visible(string name, JsonObject request)
        {
            JsonNode? source = name == "apnsAlert" ? request["payload"]!["aps"]!["alert"]
                : name == "fcm" ? FcmData(request) : request["payload"]!["convohop"];
            return (Js.Text(source, "title"), Js.Text(source, "body"));
        }

        /// <summary>The part of a request a platform's limit applies to, optionally with its visible text replaced.</summary>
        private static JsonObject Measured(string name, JsonObject request, JsonObject? text = null)
        {
            text ??= new JsonObject();
            if (name == "fcm") return new JsonObject { ["convohop"] = Js.Stringify(Js.With(FcmData(request), text)) };
            JsonObject payload = request["payload"]!.AsObject();
            if (name != "apnsAlert") return new JsonObject { ["convohop"] = Js.With(payload["convohop"]!.AsObject(), text) };
            JsonObject aps = payload["aps"]!.AsObject();
            return Js.With(payload, new JsonObject { ["aps"] = Js.With(aps, new JsonObject { ["alert"] = Js.With(aps["alert"]!.AsObject(), text) }) });
        }

        private static void Rejects(PushPayloadCode code, Action action, string? marker = null)
        {
            PushPayloadException error = Assert.Throws<PushPayloadException>(action);
            Assert.Equal(code, error.Code);
            if (marker != null) Assert.DoesNotContain(marker, error.Message, StringComparison.Ordinal);
        }

        /// <summary>
        /// Builder options: <c>Now</c> defaults to the fixed clock, <c>SystemClock</c> leaves it unset, and
        /// <c>BundleId</c> only applies to the APNs builders.
        /// </summary>
        private sealed record Opts(
            string? Title = null, string? Body = null, bool Preview = true, DateTimeOffset? Now = null, string? BundleId = Bundle,
            bool SystemClock = false);
    }
}
