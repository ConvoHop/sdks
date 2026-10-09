using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Text.Json.Nodes;

namespace Examples.Tests;

// spec/push-payload/vectors.json: notification events, builder options, and the requests each builder must return.
internal static class Vectors
{
    private static readonly Lazy<string> Document =
        new(() => File.ReadAllText(Repository.PathTo("spec", "push-payload", "vectors.json")));

    // A new copy on each call: JsonNode isn't safe to share between tests that run in parallel.
    public static IReadOnlyList<JsonObject> Push() =>
        JsonNode.Parse(Document.Value)!["vectors"]!.AsArray().Select(vector => vector!.AsObject()).ToList();

    public static JsonObject ById(string id) => Push().Single(vector => (string?)vector["id"] == id);

    // The vector's expected request for a builder, or null when the builder returns none.
    public static JsonNode? Expected(JsonObject vector, string builder) => vector["expected"]![builder]?["request"];
}
