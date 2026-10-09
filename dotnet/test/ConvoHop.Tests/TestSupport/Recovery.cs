using System.Collections.Generic;
using System.Linq;
using System.Text.Json.Nodes;

namespace ConvoHop.Tests.TestSupport
{
    /// <summary>Comparable snapshots of recovery records, like <c>assert.deepEqual</c> over <c>recoveryStates</c>.</summary>
    internal static class Recovery
    {
        internal static JsonArray Snapshot(IEnumerable<RecoveryState> states) =>
            new JsonArray(states.Select(state => (JsonNode)new JsonObject
            {
                ["requestId"] = state.RequestId,
                ["incarnation"] = state.Incarnation,
                ["payloadFingerprint"] = state.PayloadFingerprint,
                ["operation"] = state.Operation,
                ["projectId"] = state.ProjectId,
                ["input"] = JsonNode.Parse(state.Input.GetRawText()),
                ["firstSubmittedAt"] = state.FirstSubmittedAt,
                ["retryDeadline"] = state.RetryDeadline,
                ["attemptCount"] = state.AttemptCount,
                ["lastAttemptAt"] = state.LastAttemptAt,
                ["lastAttemptClassification"] = state.LastAttemptClassification,
                ["resolutionState"] = state.ResolutionState,
                ["mediaAdmissionAttempted"] = state.MediaAdmissionAttempted,
            }).ToArray());
    }
}
