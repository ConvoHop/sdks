using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Text;
using System.Text.Json;
using System.Text.Json.Nodes;
using System.Threading.Tasks;

namespace ConvoHop.Conformance
{
    /// <summary>ConvoHop conformance driver for the .NET SDK: NDJSON over stdio (spec/conformance/driver-protocol.md).</summary>
    internal sealed class Driver
    {
        private const string Name = "convohop-dotnet";
        private const string Version = "0.1.0";
        private const string Language = "csharp";

        // Sent instead when a response can't be encoded, such as an exception message with a lone surrogate.
        private const string EncodingFailure = "The driver could not encode its response";

        private readonly IReadOnlyList<string> _roles;
        private readonly Dictionary<string, SdkClient> _clients = new Dictionary<string, SdkClient>(StringComparer.Ordinal);
        private readonly Dictionary<string, InMemoryRecoveryStorage> _storages =
            new Dictionary<string, InMemoryRecoveryStorage>(StringComparer.Ordinal);
        private bool _negotiated;

        private Driver(IReadOnlyList<string> roles) => _roles = roles;

        public static async Task<int> Main(string[] arguments)
        {
            IReadOnlyList<string>? roles = DeclaredRoles(arguments);
            if (roles == null) return 2;
            using var input = new StreamReader(Console.OpenStandardInput(), new UTF8Encoding(false), false);
            using Stream output = Console.OpenStandardOutput();
            return await new Driver(roles).RunAsync(input, output).ConfigureAwait(false);
        }

        // --roles narrows the declared roles, e.g. "--roles backend" to behave like a backend-only SDK driver.
        private static IReadOnlyList<string>? DeclaredRoles(string[] arguments)
        {
            string? requested = null;
            for (int index = 0; index < arguments.Length; index++)
            {
                if (arguments[index] == "--roles" && index + 1 < arguments.Length) requested = arguments[++index];
                else if (arguments[index].StartsWith("--roles=", StringComparison.Ordinal)) requested = arguments[index].Substring(8);
                else return Usage();
            }

            if (requested == null) return Sdk.Roles;
            string[] roles = requested.Split(',').Select(role => role.Trim()).ToArray();
            return roles.All(Sdk.Roles.Contains) ? Sdk.Roles.Where(roles.Contains).ToArray() : Usage();
        }

        private static IReadOnlyList<string>? Usage()
        {
            Console.Error.WriteLine($"--roles must be a comma-separated subset of {string.Join(", ", Sdk.Roles)}");
            return null;
        }

        private async Task<int> RunAsync(TextReader input, Stream output)
        {
            string? line;
            while ((line = await input.ReadLineAsync().ConfigureAwait(false)) != null)
            {
                if (string.IsNullOrWhiteSpace(line)) continue;
                (string response, bool exit) = await HandleLineAsync(line).ConfigureAwait(false);
                // A closed stdout means the runner has gone.
                if (!await WriteAsync(output, response).ConfigureAwait(false) || exit) return 0;
            }

            Reset();
            return 0;
        }

        private async Task<(string Response, bool Exit)> HandleLineAsync(string line)
        {
            JsonDocument document;
            try
            {
                document = JsonDocument.Parse(line);
            }
            catch (JsonException)
            {
                return (Failure(null, new ProtocolException("INVALID_REQUEST", "Request is not valid JSON")), false);
            }

            using (document)
            {
                JsonElement request = document.RootElement;
                long? id = request.ValueKind == JsonValueKind.Object && Params.SafeInteger(Params.Get(request, "id"), out long number) &&
                    number >= 1 ? number : null;
                try
                {
                    if (request.ValueKind != JsonValueKind.Object || id == null)
                        throw new ProtocolException("INVALID_REQUEST", "id must be a positive integer");
                    JsonElement method = Params.Get(request, "method"), parameters = Params.Get(request, "params");
                    if (method.ValueKind != JsonValueKind.String) throw new ProtocolException("INVALID_REQUEST", "method must be a string");
                    if (parameters.ValueKind == JsonValueKind.Undefined || parameters.ValueKind == JsonValueKind.Null)
                        parameters = Params.EmptyObject;
                    if (parameters.ValueKind != JsonValueKind.Object) throw new ProtocolException("INVALID_REQUEST", "params must be an object");
                    string name = MethodName(method);
                    JsonNode? result = await DispatchAsync(name, parameters).ConfigureAwait(false);
                    if (name == "shutdown")
                    {
                        Reset();
                        return (Message(id, "result", result), true);
                    }

                    return (Message(id, "result", result), false);
                }
                catch (Exception error)
                {
                    return (Failure(id, error), false);
                }
            }
        }

        private static string MethodName(JsonElement method)
        {
            try
            {
                return method.GetString()!;
            }
            catch (InvalidOperationException)
            {
                throw new ProtocolException("UNKNOWN_METHOD", "Unknown method");
            }
        }

        private async Task<JsonNode?> DispatchAsync(string method, JsonElement args)
        {
            if (!_negotiated && method != "hello") throw new ProtocolException("INVALID_REQUEST", "hello must be the first request");
            switch (method)
            {
                case "hello": return Hello();
                case "client.create": return CreateHandle(args);
                case "client.close": return CloseHandle(args);
                case "invoke": return await InvokeAsync(args).ConfigureAwait(false);
                case "realtime.subscribe":
                case "realtime.collect":
                case "realtime.close":
                    throw new ProtocolException("UNSUPPORTED", "This driver does not declare the realtime feature");
                case "webhooks.verify": return Sdk.VerifyWebhook(args);
                case "reset": return Reset();
                case "shutdown": return new JsonObject();
                default: throw new ProtocolException("UNKNOWN_METHOD", $"Unknown method {method}");
            }
        }

        private JsonObject Hello()
        {
            if (_negotiated) throw new ProtocolException("INVALID_REQUEST", "hello was already negotiated");
            _negotiated = true;
            var packages = new JsonObject();
            foreach (KeyValuePair<string, string> package in Sdk.Packages()) packages[package.Key] = package.Value;
            var roles = new JsonObject();
            foreach (string role in _roles) roles[role] = new JsonObject { ["operations"] = Strings(Sdk.Operations(role)) };
            return new JsonObject
            {
                ["driver"] = new JsonObject { ["name"] = Name, ["version"] = Version, ["language"] = Language, ["packages"] = packages },
                ["roles"] = roles,
                ["features"] = Strings(Sdk.Features),
            };
        }

        private JsonObject CreateHandle(JsonElement args)
        {
            string name = Params.Handle(args, "client");
            if (_clients.ContainsKey(name)) throw new ParamsException($"Client handle {name} already exists");
            string role = Params.Text(args, "role");
            if (!Sdk.KnownRoles.Contains(role)) throw new ParamsException($"role must be one of {string.Join(", ", Sdk.KnownRoles)}");
            if (!_roles.Contains(role)) throw new ProtocolException("UNSUPPORTED", $"This driver does not declare the {role} role");
            string? storageName = Params.Has(args, "storage") ? Params.Handle(args, "storage") : null;
            InMemoryRecoveryStorage? storage = storageName == null ? null :
                _storages.TryGetValue(storageName, out InMemoryRecoveryStorage? existing) ? existing : new InMemoryRecoveryStorage();
            string baseUrl = Params.Text(args, "baseUrl"), credential = Params.Text(args, "credential");
            string? projectId = Params.OptionalText(args, "projectId"), incarnation = Params.OptionalText(args, "incarnation");
            // principalId belongs to the user role, which this driver doesn't declare; it is still decoded strictly.
            _ = Params.OptionalText(args, "principalId");
            string? actorId = Params.OptionalText(args, "actorId");
            _clients[name] = Sdk.CreateClient(role, baseUrl, credential, projectId, incarnation, actorId, storage);
            if (storageName != null) _storages[storageName] = storage!;
            return new JsonObject();
        }

        private JsonObject CloseHandle(JsonElement args)
        {
            string name = Params.Text(args, "client");
            if (!_clients.Remove(name)) throw new ProtocolException("UNKNOWN_HANDLE", $"Unknown client handle {name}");
            return new JsonObject();
        }

        private async Task<JsonObject> InvokeAsync(JsonElement args)
        {
            string handle = Params.Text(args, "client");
            if (!_clients.TryGetValue(handle, out SdkClient? target))
                throw new ProtocolException("UNKNOWN_HANDLE", $"Unknown client handle {handle}");
            string name = Params.Text(args, "operation");
            JsonElement input = Params.Has(args, "args") ? Params.Record(Params.Get(args, "args"), "args") : Params.EmptyObject;
            object? value;
            try
            {
                Task<object?> pending = Sdk.Start(target, name, input) ??
                    throw new ProtocolException("UNSUPPORTED", $"The {target.Role} role does not implement {name}");
                value = await pending.ConfigureAwait(false);
            }
            catch (Exception error) when (error is not ParamsException && error is not ProtocolException)
            {
                return new JsonObject { ["ok"] = false, ["error"] = Sdk.Error(error) };
            }

            return new JsonObject { ["ok"] = true, ["value"] = Sdk.Project(value) };
        }

        private JsonObject Reset()
        {
            _clients.Clear();
            _storages.Clear();
            return new JsonObject();
        }

        private static JsonArray Strings(IEnumerable<string> values) => new JsonArray(values.Select(value => (JsonNode?)value).ToArray());

        private static string Message(long? id, string member, JsonNode? value) =>
            new JsonObject { ["id"] = id, [member] = value }.ToJsonString();

        private static string Failure(long? id, Exception error)
        {
            (string code, string message) = error switch
            {
                ProtocolException protocol => (protocol.Code, protocol.Message),
                ParamsException => ("INVALID_PARAMS", error.Message),
                _ => ("DRIVER_FAILURE", error.Message),
            };
            try
            {
                return Message(id, "error", new JsonObject { ["code"] = code, ["message"] = message });
            }
            catch (ArgumentException)
            {
                return Message(id, "error", new JsonObject { ["code"] = code, ["message"] = EncodingFailure });
            }
        }

        private static async Task<bool> WriteAsync(Stream output, string response)
        {
            byte[] bytes = Encoding.UTF8.GetBytes(response + "\n");
            try
            {
                await output.WriteAsync(bytes, 0, bytes.Length).ConfigureAwait(false);
                await output.FlushAsync().ConfigureAwait(false);
                return true;
            }
            catch (IOException)
            {
                return false;
            }
        }
    }
}
