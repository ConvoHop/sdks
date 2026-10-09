using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Reflection;
using System.Reflection.Metadata;
using System.Reflection.PortableExecutable;
using System.Runtime.CompilerServices;
using Xunit;

namespace ConvoHop.Tests
{
    /// <summary>
    /// The public surface and dependencies of the <c>ConvoHop</c> assembly, ported from the server and core
    /// <c>surface.test.mjs</c> and <c>import-scan.test.mjs</c>.
    /// </summary>
    /// <remarks>
    /// .NET ships one assembly, so the JavaScript checks have no direct equivalent here. Core bindings are not shared by
    /// identity across packages, and built files are not reachable through an exports map; type visibility does that job. The
    /// import scan becomes a metadata scan of every type and assembly that the compiled library references, method bodies
    /// included, so the scanner self-test becomes positive controls. The tests run against the netstandard2.0 build on
    /// net8.0 and net9.0 and against the net10.0 build on net10.0.
    /// </remarks>
    public sealed class SurfaceTests
    {
        private static readonly Assembly Library = typeof(ConvoHopTransport).Assembly;

        [Fact]
        public void PublicRuntimeTypesArePinned()
        {
            string[] actual = Library.GetExportedTypes()
                .Where(type => type.Namespace == "ConvoHop")
                .Select(type => type.FullName!.Substring("ConvoHop.".Length))
                .OrderBy(name => name, StringComparer.Ordinal)
                .ToArray();

            Assert.Equal(new[]
            {
                "ApnsAlertContent", "ApnsAlertRequest", "ApnsPushOptions", "ApnsVoipRequest", "ContextField", "ContextFieldUse",
                "ConvoHopException", "ConvoHopManagementClient", "ConvoHopManagementClientOptions", "ConvoHopTransport",
                "ConvoHopTransportOptions", "DeploymentOptions", "ErrorCodes", "FcmAndroidConfig", "FcmRequest", "IRecoveryStorage",
                "InMemoryRecoveryStorage", "NoInput", "OperationDescriptor", "OperationDescriptor`2", "OperationKind", "Operations",
                "Operations+Communication", "Operations+Management", "ProjectOptions", "ProjectServerClient",
                "ProjectServerClientOptions", "PushData", "PushOptions", "PushPayloadCode", "PushPayloadException", "PushPayloads",
                "RecoveryState", "ScopeRequiredException", "ServerConversation", "ServerConversationLive", "ServerConversations",
                "ServerLiveOperation", "ServerLiveSession", "ServerMembers", "ServerMessages", "ServerPrincipals", "ServerRequests",
                "ServerSessions", "VerifiedWebhookDelivery", "WebPushRequest", "WebhookCallCancelReasons",
                "WebhookCallCancelledNotificationEvent", "WebhookCallMediaProfiles", "WebhookCallNotificationEvent",
                "WebhookEndpointDisabledEvent", "WebhookEvent", "WebhookEventTypes", "WebhookHeaders", "WebhookMessageNotificationEvent",
                "WebhookNotificationEvent", "WebhookNotificationPreview", "WebhookResourceEvent", "WebhookSignature", "WebhookSubjectRef",
                "WebhookUnknownEvent", "WebhookVerificationCode", "WebhookVerificationException", "Webhooks",
            }, actual);
        }

        [Fact]
        public void ImplementationHelpersAndGeneratedPlumbingStayInternal()
        {
            Type[] all = Library.GetTypes();

            // This also keeps the netstandard2.0 polyfills in System.* namespaces internal.
            Assert.Equal(new[] { "ConvoHop", "ConvoHop.Api", "ConvoHop.Models" },
                Library.GetExportedTypes().Select(type => type.Namespace!).Distinct().OrderBy(name => name, StringComparer.Ordinal));
            // Positive controls: the hidden namespaces exist, so the check above is not vacuous.
            foreach (string hidden in new[] { "ConvoHop.Internal", "ConvoHop.Generated" })
                Assert.Contains(all, type => type.Namespace == hidden && !type.IsVisible);
            Assert.Equal(new[] { "ConvoHop.Tests" }, Library.GetCustomAttributes<InternalsVisibleToAttribute>().Select(attribute => attribute.AssemblyName));
        }

        [Fact]
        public void GeneratedPlaneApisArePinnedAndOnlyClientsCreateThem()
        {
            Type[] apis = Library.GetExportedTypes()
                .Where(type => type.Namespace == "ConvoHop.Api")
                .OrderBy(type => type.Name, StringComparer.Ordinal)
                .ToArray();

            Assert.Equal(new[] { "CommunicationApi", "ManagementApi" }, apis.Select(type => type.Name));
            Assert.All(apis, type =>
            {
                Assert.True(type.IsSealed, type.Name);
                Assert.Empty(type.GetConstructors());
            });
            Assert.Equal(typeof(Api.CommunicationApi), typeof(ProjectServerClient).GetProperty(nameof(ProjectServerClient.Communication))!.PropertyType);
            Assert.Equal(typeof(Api.ManagementApi),
                typeof(ConvoHopManagementClient).GetProperty(nameof(ConvoHopManagementClient.Management))!.PropertyType);
        }

        [Fact]
        public void ServerSurfaceExposesNoUserSessionRealtimeOrMediaApi()
        {
            string[] clientOnly =
            {
                "ConversationHandle", "ConversationLive", "ConversationStream", "ConvoHopClient", "LiveEndOperation",
                "LiveParticipationHandle", "LiveSessionHandle", "LiveStartOperation", "MediaConnection",
            };
            Type[] exported = Library.GetExportedTypes();
            Type[] runtime = exported.Where(type => type.Namespace == "ConvoHop" || type.Namespace == "ConvoHop.Api").ToArray();

            Assert.All(clientOnly, name => Assert.DoesNotContain(exported, type => type.Name == name));
            Assert.All(Operations.All, operation => Assert.NotEqual("client", operation.Layer));
            // The runtime authenticates with backend or operator credentials; only generated results carry an issued session token.
            Assert.All(runtime, type =>
            {
                IEnumerable<string> names = type.GetProperties().Select(property => property.Name)
                    .Concat(type.GetMethods().SelectMany(method => method.GetParameters()).Select(parameter => parameter.Name ?? ""))
                    .Concat(type.GetConstructors().SelectMany(constructor => constructor.GetParameters()).Select(parameter => parameter.Name ?? ""));
                Assert.DoesNotContain(names, name => name.IndexOf("sessionToken", StringComparison.OrdinalIgnoreCase) >= 0);
            });
        }

        [Fact]
        public void CompiledLibraryReferencesOnlyTheBaseLibrary()
        {
            using FileStream stream = File.OpenRead(Library.Location);
            using var image = new PEReader(stream);
            MetadataReader metadata = image.GetMetadataReader();
            string[] assemblies = metadata.AssemblyReferences
                .Select(handle => metadata.GetString(metadata.GetAssemblyReference(handle).Name))
                .ToArray();
            string[] types = metadata.TypeReferences.Select(handle => FullName(metadata, handle)).ToArray();

            Assert.All(assemblies, name => Assert.True(name == "netstandard" || name == "System" ||
                name.StartsWith("System.", StringComparison.Ordinal) || name.StartsWith("Microsoft.Bcl.", StringComparison.Ordinal), name));
            Assert.Contains(assemblies, name => name == "netstandard" || name == "System.Runtime");
            foreach (string forbidden in new[] { "System.Net.WebSockets", "Newtonsoft.", "LiveKit" })
            {
                Assert.DoesNotContain(assemblies, name => name.StartsWith(forbidden, StringComparison.Ordinal));
                Assert.DoesNotContain(types, name => name.StartsWith(forbidden, StringComparison.Ordinal));
            }

            // Positive controls: the scan sees types referenced only inside method bodies.
            Assert.Contains("System.Security.Cryptography.HMACSHA256", types);
            Assert.Contains("System.Net.Http.HttpClient", types);
            Assert.Contains("System.Text.Json.Utf8JsonWriter", types);
        }

        private static string FullName(MetadataReader metadata, TypeReferenceHandle handle)
        {
            TypeReference reference = metadata.GetTypeReference(handle);
            string name = metadata.GetString(reference.Name);
            return reference.ResolutionScope.Kind == HandleKind.TypeReference
                ? FullName(metadata, (TypeReferenceHandle)reference.ResolutionScope) + "+" + name
                : metadata.GetString(reference.Namespace) + "." + name;
        }
    }
}
