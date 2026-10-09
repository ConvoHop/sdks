using System;
using System.Collections.Generic;
using System.Linq;
using System.Reflection;
using System.Text.Json.Nodes;
using ConvoHop.Tests.TestSupport;
using Xunit;

namespace ConvoHop.Tests
{
    /// <summary>The generated operation catalog, models and error codes agree with <c>schema/ir.json</c>.</summary>
    public sealed class OperationCatalogTests
    {
        [Fact]
        public void CatalogHoldsEveryServerAndBothQueryAndMutationInIrOrder()
        {
            JsonArray operations = Spec.Load("ir.json")["operations"]!.AsArray();

            Assert.Equal(ServerOperations().Select(operation => (string)operation["id"]!), Operations.All.Select(operation => operation.Id));
            Assert.Equal(new[] { "Query", "Mutation" }, Enum.GetNames(typeof(OperationKind)));
            // The server SDK has no subscription transport, so a backend subscription must fail here rather than vanish.
            Assert.DoesNotContain(operations, operation => (string?)operation!["kind"] == "subscription" && (string?)operation["layer"] != "client");
        }

        [Fact]
        public void EveryDescriptorMirrorsItsIrOperation()
        {
            Dictionary<string, JsonArray> inputFields = Spec.Load("ir.json")["types"]!.AsArray()
                .Where(type => (string?)type!["kind"] == "input")
                .ToDictionary(type => (string)type!["name"]!,
                    type => new JsonArray(type!["fields"]!.AsArray().Select(field => (JsonNode?)(string?)field!["name"]).ToArray()), StringComparer.Ordinal);
            var expected = new JsonArray(ServerOperations().Select(operation =>
            {
                JsonNode? input = operation["input"];
                JsonNode result = operation["result"]!["type"]!;
                string resultName = (string)result["name"]!;
                return (JsonNode)new JsonObject
                {
                    ["id"] = operation["id"]!.DeepClone(),
                    ["plane"] = operation["plane"]!.DeepClone(),
                    ["kind"] = operation["kind"]!.DeepClone(),
                    ["field"] = operation["field"]!.DeepClone(),
                    ["operationName"] = operation["operationName"]!.DeepClone(),
                    ["document"] = operation["document"]!["text"]!.DeepClone(),
                    ["resultType"] = resultName + ((bool)result["nullable"]! ? "" : "!"),
                    ["resultClrType"] = resultName,
                    ["contextArgument"] = operation["context"]!["argument"]!.DeepClone(),
                    ["contextFields"] = operation["context"]!["fields"]!.DeepClone(),
                    ["inputArgument"] = input?["argument"]?.DeepClone(),
                    ["inputRequired"] = input != null && (bool)input["required"]!,
                    ["inputType"] = input == null ? nameof(NoInput) : (string)input["type"]!,
                    ["inputFields"] = input == null ? new JsonArray() : inputFields[(string)input["type"]!].DeepClone(),
                    ["idempotency"] = operation["idempotency"]!.DeepClone(),
                    ["layer"] = operation["layer"]!.DeepClone(),
                    ["pagination"] = operation["pagination"]!["style"]!.DeepClone(),
                };
            }).ToArray());
            var actual = new JsonArray(Operations.All.Select(operation => (JsonNode)new JsonObject
            {
                ["id"] = operation.Id,
                ["plane"] = operation.Plane,
                ["kind"] = operation.Kind.ToString().ToLowerInvariant(),
                ["field"] = operation.Field,
                ["operationName"] = operation.OperationName,
                ["document"] = operation.Document,
                ["resultType"] = operation.ResultType,
                ["resultClrType"] = operation.ResultClrType.Name,
                ["contextArgument"] = operation.ContextArgument,
                ["contextFields"] = new JsonArray(operation.ContextFields.Select(field => (JsonNode)new JsonObject
                {
                    ["name"] = field.Name,
                    ["use"] = field.Use.ToString().ToLowerInvariant(),
                }).ToArray()),
                ["inputArgument"] = operation.InputArgument,
                ["inputRequired"] = operation.InputRequired,
                ["inputType"] = operation.InputType.Name,
                ["inputFields"] = new JsonArray(operation.InputFields.Select(field => (JsonNode?)field).ToArray()),
                ["idempotency"] = operation.Idempotency,
                ["layer"] = operation.Layer,
                ["pagination"] = operation.Pagination,
            }).ToArray());

            Js.Equal(expected, actual);
        }

        [Fact]
        public void TypedAccessorsAreTheCatalogEntries()
        {
            OperationDescriptor[] accessors = new[] { typeof(Operations.Communication), typeof(Operations.Management) }
                .SelectMany(type => type.GetFields(BindingFlags.Public | BindingFlags.Static))
                .Select(field => (OperationDescriptor)field.GetValue(null)!)
                .ToArray();

            Assert.Equal(Operations.All.Count, accessors.Length);
            Assert.All(Operations.All, operation => Assert.Contains(operation, accessors));
            Assert.All(Operations.All, operation =>
            {
                Type descriptor = operation.GetType();
                Assert.Equal(typeof(OperationDescriptor<,>), descriptor.GetGenericTypeDefinition());
                Assert.Equal(new[] { operation.InputType, operation.ResultClrType }, descriptor.GetGenericArguments());
            });
            Assert.Same(Operations.Communication.SendMessage, Operations.All.Single(operation => operation.Id == "communication.sendMessage"));
        }

        [Fact]
        public void ModelsAreGeneratedOnlyFromIrTypes()
        {
            var irTypes = new HashSet<string>(Spec.Load("ir.json")["types"]!.AsArray()
                .Where(type => (string?)type!["kind"] is "object" or "input" or "enum")
                .Select(type => (string)type!["name"]!), StringComparer.Ordinal);
            Type[] models = typeof(Operations).Assembly.GetExportedTypes().Where(type => type.Namespace == "ConvoHop.Models").ToArray();

            Assert.NotEmpty(models);
            Assert.All(models, model => Assert.True(!model.IsNested && irTypes.Contains(model.Name), model.FullName));
            Assert.All(Operations.All, operation =>
            {
                if (operation.InputType != typeof(NoInput)) Assert.Contains(operation.InputType, models);
                Assert.Contains(operation.ResultClrType, models);
            });
        }

        [Fact]
        public void ErrorCodesListEveryIrCodeByItsWireName()
        {
            string[] expected = Spec.Load("ir.json")["errors"]!["codes"]!.AsArray().Select(code => (string)code!["name"]!).ToArray();
            string[] actual = typeof(ErrorCodes).GetFields(BindingFlags.Public | BindingFlags.Static)
                .Where(field => field.IsLiteral && field.FieldType == typeof(string))
                .Select(field => (string)field.GetRawConstantValue()!)
                .ToArray();

            Assert.Equal(expected.OrderBy(code => code, StringComparer.Ordinal), actual.OrderBy(code => code, StringComparer.Ordinal));
            Assert.Equal("SCOPE_REQUIRED", ErrorCodes.ScopeRequired);
        }

        private static IEnumerable<JsonNode> ServerOperations() => Spec.Load("ir.json")["operations"]!.AsArray()
            .Select(operation => operation!)
            .Where(operation => (string?)operation["layer"] != "client" && (string?)operation["kind"] != "subscription");
    }
}
