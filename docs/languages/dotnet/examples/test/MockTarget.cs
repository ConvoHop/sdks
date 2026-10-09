using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.IO;
using System.Linq;
using System.Net.Http;
using System.Net.Http.Json;
using System.Text.Json;
using System.Text.Json.Nodes;
using System.Threading.Tasks;
using Xunit;

namespace Examples.Tests;

// Starts the conformance mock, a local stand-in for the ConvoHop API, as a Node.js process.
public sealed class MockTarget : IAsyncLifetime
{
    private static readonly HttpClient Http = new();
    private Process? _process;

    public string CommunicationUrl { get; private set; } = "";
    public string ProjectId { get; private set; } = "";
    public string Incarnation { get; private set; } = "";
    public string BackendKey { get; private set; } = "";
    public string Control { get; private set; } = "";

    public ServerExamples.ServerConfig Config => new(CommunicationUrl, ProjectId, Incarnation, BackendKey);

    public async Task InitializeAsync()
    {
        var start = new ProcessStartInfo("node") { RedirectStandardOutput = true, UseShellExecute = false };
        start.ArgumentList.Add(Repository.PathTo("conformance", "mock", "cli.mjs"));
        try
        {
            _process = Process.Start(start) ?? throw new InvalidOperationException("Node.js didn't start.");
        }
        catch (System.ComponentModel.Win32Exception exception)
        {
            throw new InvalidOperationException("The tests start the conformance mock with Node.js, which isn't on PATH.", exception);
        }
        // The mock prints its descriptor as one JSON line. It imports graphql, so run npm ci at the repository root.
        string line = await _process.StandardOutput.ReadLineAsync()
            ?? throw new InvalidOperationException("The conformance mock exited before it started. Did you run npm ci at the root?");
        _ = _process.StandardOutput.BaseStream.CopyToAsync(Stream.Null); // Keep the pipe drained.
        using JsonDocument descriptor = JsonDocument.Parse(line);
        JsonElement root = descriptor.RootElement;
        CommunicationUrl = root.GetProperty("communicationUrl").GetString()!;
        ProjectId = root.GetProperty("projectId").GetString()!;
        Incarnation = root.GetProperty("incarnation").GetString()!;
        BackendKey = root.GetProperty("credentials").GetProperty("backend").GetString()!;
        Control = root.GetProperty("control").GetString()!;
    }

    public async Task DisposeAsync()
    {
        if (_process == null) return;
        if (!_process.HasExited) _process.Kill(entireProcessTree: true);
        await _process.WaitForExitAsync();
        _process.Dispose();
    }

    // Makes the mock fail the next request to a GraphQL field: it closes the socket before or after committing.
    public async Task InjectFaultAsync(string field, string action)
    {
        using HttpResponseMessage response = await Http.PostAsJsonAsync($"{Control}/fault", new { field, action });
        response.EnsureSuccessStatusCode();
    }

    // Whether each request the mock received for a field and request ID was dropped, oldest first.
    public async Task<IReadOnlyList<bool>> AttemptsAsync(string field, string requestId)
    {
        JsonNode log = JsonNode.Parse(await Http.GetStringAsync($"{Control}/log"))!;
        return log["entries"]!.AsArray()
            .Select(entry => entry!.AsObject())
            .Where(entry => (string?)entry["kind"] == "request" && (string?)entry["field"] == field
                && (string?)entry["requestId"] == requestId)
            .Select(entry => (bool)entry["dropped"]!)
            .ToList();
    }
}

[CollectionDefinition("mock")]
public sealed class MockCollection : ICollectionFixture<MockTarget>
{
}
