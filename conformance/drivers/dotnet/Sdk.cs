using System;
using System.Collections.Generic;
using System.Linq;
using System.Reflection;
using System.Text.Json;
using System.Text.Json.Nodes;
using System.Text.Json.Serialization.Metadata;
using System.Threading.Tasks;
using ConvoHop.Models;

namespace ConvoHop.Conformance
{
    /// <summary>A protocol-level failure with its own code (spec/conformance/driver-protocol.md, Errors).</summary>
    internal sealed class ProtocolException : Exception
    {
        public ProtocolException(string code, string message) : base(message) => Code = code;

        public string Code { get; }
    }

    /// <summary>A constructed SDK client with the role it was created for.</summary>
    internal sealed class SdkClient
    {
        private SdkClient(string role, ProjectServerClient? backend, ConvoHopManagementClient? management)
        {
            Role = role;
            Backend = backend;
            Management = management;
        }

        public string Role { get; }

        public ProjectServerClient? Backend { get; }

        public ConvoHopManagementClient? Management { get; }

        public static SdkClient For(ProjectServerClient client) => new SdkClient(Sdk.BackendRole, client, null);

        public static SdkClient For(ConvoHopManagementClient client) => new SdkClient(Sdk.ManagementRole, null, client);
    }

    /// <summary>The only driver file that calls the SDK: retarget the driver here.</summary>
    internal static class Sdk
    {
        public const string UserRole = "user";
        public const string BackendRole = "backend";
        public const string ManagementRole = "management";

        /// <summary>Every role the protocol defines.</summary>
        public static readonly IReadOnlyList<string> KnownRoles = new[] { UserRole, BackendRole, ManagementRole };

        /// <summary>The roles this SDK implements. User sessions belong to the client SDKs.</summary>
        public static readonly IReadOnlyList<string> Roles = new[] { BackendRole, ManagementRole };

        public static readonly IReadOnlyList<string> Features = new[] { "recovery.eviction", "recovery.spentBudget", "recovery.storage", "retryAfter", "webhooks.verify" };

        // The largest Unix time DateTimeOffset represents (9999-12-31T23:59:59Z).
        private const long MaxDateSeconds = 253402300799;

        // The protocol allows any time JavaScript dates represent; .NET dates end earlier.
        private const long MaxProtocolSeconds = 8640000000000;

        private static readonly JsonSerializerOptions Projection = new JsonSerializerOptions
        {
            TypeInfoResolver = new DefaultJsonTypeInfoResolver(),
        };

        private static readonly (string Name, Func<ProjectServerClient, JsonElement, Task<object?>> Run)[] BackendOperations =
        {
            ("route.initialize", async (client, args) =>
            {
                await client.InitializeAsync().ConfigureAwait(false);
                return null;
            }),
            ("principals.create", async (client, args) =>
            {
                Principal principal = await client.Principals.CreateAsync(Params.Text(args, "externalUserId")).ConfigureAwait(false);
                return new JsonObject { ["principalId"] = principal.PrincipalId };
            }),
            ("sessions.issue", async (client, args) =>
            {
                string principalId = Params.Text(args, "principalId"), deviceId = Params.Text(args, "deviceId");
                return await client.Sessions.IssueAsync(principalId, deviceId, Params.OptionalText(args, "requestedTtlMs"))
                    .ConfigureAwait(false);
            }),
            ("conversations.create", async (client, args) =>
            {
                CreateConversationRequestInput input = ConversationInput(args);
                return await client.Conversations.CreateAsync(input, Params.OptionalText(args, "requestId")).ConfigureAwait(false);
            }),
            ("conversations.get", async (client, args) =>
                await client.Conversation(Params.Text(args, "conversationId")).GetAsync().ConfigureAwait(false)),
            ("members.list", async (client, args) =>
            {
                ServerConversation conversation = client.Conversation(Params.Text(args, "conversationId"));
                long? limit = Params.Integer(args, "limit", 1, 100);
                return await conversation.Members.ListAsync((int?)limit, Params.OptionalText(args, "cursor")).ConfigureAwait(false);
            }),
            ("members.add", async (client, args) =>
            {
                string conversationId = Params.Text(args, "conversationId");
                IReadOnlyList<MemberBatchEntryInput> members = Batch(args);
                string? requestId = Params.OptionalText(args, "requestId");
                return await client.Conversation(conversationId).Members.AddBatchAsync(members, requestId).ConfigureAwait(false);
            }),
            ("messages.list", async (client, args) =>
            {
                string? beforeSequence = Params.OptionalText(args, "beforeSequence");
                ServerConversation conversation = client.Conversation(Params.Text(args, "conversationId"));
                return await conversation.Messages.ListAsync(null, beforeSequence, Params.OptionalText(args, "actAs"))
                    .ConfigureAwait(false);
            }),
            ("messages.send", async (client, args) =>
            {
                ServerConversation conversation = client.Conversation(Params.Text(args, "conversationId"));
                string text = Params.Text(args, "text");
                string? actAs = Params.OptionalText(args, "actAs"), requestId = Params.OptionalText(args, "requestId");
                return await conversation.Messages.SendAsync(text, null, actAs, requestId).ConfigureAwait(false);
            }),
            ("messages.edit", async (client, args) =>
            {
                MessageRef current = Message(args);
                ServerConversation conversation = client.Conversation(current.ConversationId);
                string text = Params.Text(args, "text");
                return await conversation.Messages.EditAsync(current.MessageId, current.Revision, text, null,
                    Params.OptionalText(args, "requestId")).ConfigureAwait(false);
            }),
            ("messages.delete", async (client, args) =>
            {
                MessageRef current = Message(args);
                ServerConversation conversation = client.Conversation(current.ConversationId);
                return await conversation.Messages.DeleteAsync(current.MessageId, current.Revision,
                    Params.OptionalText(args, "requestId")).ConfigureAwait(false);
            }),
        };

        private static readonly (string Name, Func<ConvoHopManagementClient, JsonElement, Task<object?>> Run)[] ManagementOperations =
        {
            ("backendKeys.issue", async (client, args) =>
            {
                string projectId = Params.Text(args, "projectId"), name = Params.Text(args, "name");
                IReadOnlyList<string> scopes = Params.Strings(args, "scopes");
                return await client.IssueBackendKeyAsync(projectId, name, scopes, Params.Text(args, "expiresAt")).ConfigureAwait(false);
            }),
        };

        /// <summary>The operations each implemented role declares, in catalog order.</summary>
        public static IReadOnlyList<string> Operations(string role) => role switch
        {
            BackendRole => BackendOperations.Select(operation => operation.Name).ToArray(),
            ManagementRole => ManagementOperations.Select(operation => operation.Name).ToArray(),
            _ => Array.Empty<string>(),
        };

        /// <summary>The SDK packages under test and their versions.</summary>
        public static IReadOnlyDictionary<string, string> Packages()
        {
            string? version = typeof(ProjectServerClient).Assembly.GetCustomAttribute<AssemblyInformationalVersionAttribute>()
                ?.InformationalVersion;
            // SourceLink appends "+<commit>"; reports show the package version.
            int metadata = version?.IndexOf('+') ?? -1;
            return new Dictionary<string, string> { ["ConvoHop"] = metadata < 0 ? version ?? "unknown" : version!.Substring(0, metadata) };
        }

        /// <summary>Constructs an SDK client without network I/O; constructor validation failures are INVALID_PARAMS.</summary>
        public static SdkClient CreateClient(string role, string baseUrl, string credential, string? projectId, string? incarnation,
            string? actorId, IRecoveryStorage? storage)
        {
            try
            {
                switch (role)
                {
                    case BackendRole:
                        return SdkClient.For(new ProjectServerClient(new ProjectServerClientOptions
                        {
                            BaseUrl = baseUrl,
                            ProjectId = Required(projectId, "projectId"),
                            Incarnation = Required(incarnation, "incarnation"),
                            BackendKey = credential,
                            RecoveryStorage = storage,
                        }));
                    case ManagementRole:
                        return SdkClient.For(new ConvoHopManagementClient(new ConvoHopManagementClientOptions
                        {
                            BaseUrl = baseUrl,
                            AccessToken = credential,
                            ActorId = Required(actorId, "actorId"),
                            RecoveryStorage = storage,
                        }));
                    default:
                        throw new ProtocolException("UNSUPPORTED", $"This driver does not declare the {role} role");
                }
            }
            catch (Exception error) when (error is not ParamsException && error is not ProtocolException)
            {
                throw new ParamsException(error.Message);
            }
        }

        /// <summary>Starts an operation; null means the role does not implement it. Decoding failures throw ParamsException.</summary>
        public static Task<object?>? Start(SdkClient client, string name, JsonElement args)
        {
            if (client.Backend != null)
            {
                foreach ((string operation, Func<ProjectServerClient, JsonElement, Task<object?>> run) in BackendOperations)
                    if (operation == name) return run(client.Backend, args);
            }
            else if (client.Management != null)
            {
                foreach ((string operation, Func<ConvoHopManagementClient, JsonElement, Task<object?>> run) in ManagementOperations)
                    if (operation == name) return run(client.Management, args);
            }

            return null;
        }

        /// <summary>The protocol's JSON form of an operation result.</summary>
        public static JsonNode? Project(object? value) =>
            value == null ? null : JsonSerializer.SerializeToNode(value, value.GetType(), Projection);

        /// <summary>Language-neutral projection of an SDK failure (driver-protocol.md, sdkError).</summary>
        public static JsonObject Error(Exception error)
        {
            if (error is ConvoHopException problem)
            {
                return new JsonObject
                {
                    ["code"] = problem.Code,
                    // The SDK reports transport failures with status 0; the protocol uses null for "no authority HTTP status".
                    ["status"] = problem.Status == 0 ? null : JsonValue.Create(problem.Status),
                    ["outcome"] = problem.Outcome,
                    ["requestId"] = problem.RequestId,
                    ["retryAfterMs"] = problem.RetryAfter?.Ticks / TimeSpan.TicksPerMillisecond,
                    ["message"] = problem.Message,
                };
            }

            return new JsonObject
            {
                ["code"] = "SDK_ERROR",
                ["status"] = null,
                ["outcome"] = null,
                ["requestId"] = null,
                ["retryAfterMs"] = null,
                ["message"] = error.Message,
            };
        }

        /// <summary>Verifies one delivery's signature with the SDK (driver-protocol.md, webhooks.verify).</summary>
        public static JsonObject VerifyWebhook(JsonElement args)
        {
            // JSON.parse keeps the last of duplicate names; the SDK would treat a repeated header as ambiguous.
            var headers = new Dictionary<string, string>(StringComparer.Ordinal);
            foreach (JsonProperty header in Params.Record(Params.Get(args, "headers"), "headers").EnumerateObject())
                headers[header.Name] = Params.StringValue(header.Value, $"headers.{header.Name}");

            IReadOnlyList<string> secrets = Params.Strings(args, "secrets");
            if (secrets.Count == 0) throw new ParamsException("secrets must not be empty");
            long? nowSeconds = Params.Integer(args, "nowSeconds", 0, MaxProtocolSeconds);
            long? toleranceSeconds = Params.Integer(args, "toleranceSeconds", 0, Params.MaxSafeInteger);
            if (nowSeconds == null || toleranceSeconds == null) throw new ParamsException("nowSeconds and toleranceSeconds are required");
            if (nowSeconds > MaxDateSeconds)
                throw new ParamsException($"nowSeconds must not exceed {MaxDateSeconds}, the last second .NET dates represent");
            string payload = Params.Text(args, "payload");
            try
            {
                Webhooks.VerifySignature(WebhookHeaders.From(headers), payload, secrets, toleranceSeconds.Value,
                    DateTimeOffset.FromUnixTimeSeconds(nowSeconds.Value));
                return new JsonObject { ["valid"] = true, ["code"] = null };
            }
            catch (WebhookVerificationException error)
            {
                return new JsonObject { ["valid"] = false, ["code"] = WebhookCode(error.Code) };
            }
        }

        // The SDK's finer codes projected onto the protocol's webhookCode. Size limits are the sender's contract, so a
        // delivery beyond them cannot carry a valid signature.
        private static string WebhookCode(WebhookVerificationCode code) => code switch
        {
            WebhookVerificationCode.MissingHeader or WebhookVerificationCode.InvalidHeader => "WEBHOOK_HEADERS_MISSING",
            WebhookVerificationCode.InvalidTimestamp => "WEBHOOK_TIMESTAMP_INVALID",
            WebhookVerificationCode.TimestampExpired => "WEBHOOK_TIMESTAMP_EXPIRED",
            WebhookVerificationCode.TimestampFuture => "WEBHOOK_TIMESTAMP_FUTURE",
            WebhookVerificationCode.BodyTooLarge or WebhookVerificationCode.TooManySignatures or
                WebhookVerificationCode.NoMatchingSignature => "WEBHOOK_SIGNATURE_INVALID",
            WebhookVerificationCode.InvalidSecret => throw new ParamsException("secrets must be whsec_ secrets"),
            WebhookVerificationCode.InvalidBody => throw new InvalidOperationException("Signature verification does not parse the body"),
            _ => throw new InvalidOperationException($"Unknown webhook verification code {code}"),
        };

        private static string Required(string? value, string name) =>
            value ?? throw new ParamsException($"{name} is required for this role");

        private static CreateConversationRequestInput ConversationInput(JsonElement args)
        {
            JsonElement input = Params.Record(Params.Get(args, "input"), "input");
            string title = Params.Text(input, "title");
            JsonElement props = Params.Record(Params.Get(input, "props"), "input.props");
            var members = Params.Entries(input, "members")
                .Select(member => new MemberInputInput(Params.Text(member, "principalId"), Params.Text(member, "role")))
                .ToArray();
            return new CreateConversationRequestInput(title, props.Clone(), members);
        }

        private static IReadOnlyList<MemberBatchEntryInput> Batch(JsonElement args) =>
            Params.Entries(args, "members")
                .Select(member => new MemberBatchEntryInput(Params.Text(member, "principalId"), Params.Text(member, "role"),
                    Params.Text(member, "expectedRevision")))
                .ToArray();

        // A Message value from an earlier result. Only the fields the SDK needs are read; the SDK validates their format.
        private static MessageRef Message(JsonElement args)
        {
            try
            {
                JsonElement message = Params.Record(Params.Get(args, "message"), "message");
                return new MessageRef(Params.Text(message, "conversationId"), Params.Text(message, "messageId"),
                    Params.Text(message, "revision"));
            }
            catch (ParamsException)
            {
                throw new ParamsException("message is not a valid protocol value");
            }
        }

        private readonly struct MessageRef
        {
            public MessageRef(string conversationId, string messageId, string revision)
            {
                ConversationId = conversationId;
                MessageId = messageId;
                Revision = revision;
            }

            public string ConversationId { get; }

            public string MessageId { get; }

            public string Revision { get; }
        }
    }
}
