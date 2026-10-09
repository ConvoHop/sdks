using System;
using System.Collections.Generic;
using System.IO;
using System.Text;
using System.Text.Json;
using ConvoHop.Internal;

namespace ConvoHop
{
    /// <summary>
    /// A snapshot of one mutation recovery record: the original request identity, payload and attempt budget. Use it to
    /// resolve or retry the original request after an uncertain outcome; never invent a replacement request ID.
    /// </summary>
    public sealed class RecoveryState
    {
        internal RecoveryState(RecoveryRecord record)
        {
            RequestId = record.RequestId;
            Incarnation = record.Incarnation;
            PayloadFingerprint = record.PayloadFingerprint;
            Operation = record.Operation.Id;
            ProjectId = record.ProjectId;
            Input = record.Input;
            FirstSubmittedAt = record.FirstSubmittedAt;
            RetryDeadline = record.RetryDeadline;
            AttemptCount = record.AttemptCount;
            LastAttemptAt = record.LastAttemptAt;
            LastAttemptClassification = record.LastAttemptClassification;
            ResolutionState = record.ResolutionState;
            MediaAdmissionAttempted = record.MediaAdmissionAttempted;
        }

        /// <summary>The original request ID.</summary>
        public string RequestId { get; }

        /// <summary>The project incarnation the request belongs to, or <c>management</c>.</summary>
        public string Incarnation { get; }

        /// <summary>The <c>sha256:</c> fingerprint of the operation, project and canonical input.</summary>
        public string PayloadFingerprint { get; }

        /// <summary>The generated operation ID, for example <c>communication.sendMessage</c>.</summary>
        public string Operation { get; }

        /// <summary>The project of a communication request; null for management requests.</summary>
        public string? ProjectId { get; }

        /// <summary>The original operation input.</summary>
        public JsonElement Input { get; }

        /// <summary>When the request was first recorded, in Unix milliseconds.</summary>
        public long FirstSubmittedAt { get; }

        /// <summary>The last moment a resend is allowed, in Unix milliseconds.</summary>
        public long RetryDeadline { get; }

        /// <summary>How many times the request was submitted.</summary>
        public long AttemptCount { get; }

        /// <summary>When the request was last submitted, in Unix milliseconds.</summary>
        public long LastAttemptAt { get; }

        /// <summary>How the last attempt ended: <c>notSubmitted</c>, <c>submitted</c>, <c>authorityReceipt</c>, an error code, or <c>opaqueTransportFailure</c>.</summary>
        public string LastAttemptClassification { get; }

        /// <summary>What is known about the outcome: <c>pending</c> (never sent), <c>unknown</c>, <c>rejected</c> (the authority rejected every attempt), <c>committed</c> or <c>accepted</c>.</summary>
        public string ResolutionState { get; }

        /// <summary>Whether a native media admission was attempted with the credentials this request issued.</summary>
        public bool MediaAdmissionAttempted { get; }
    }
}

namespace ConvoHop.Internal
{
    // A mutable recovery record. The transport mutates it only while holding its gate.
    internal sealed class RecoveryRecord
    {
        internal const int MaxRecords = 128;

        internal RecoveryRecord(string requestId, string incarnation, string payloadFingerprint, OperationDescriptor operation,
            string? projectId, JsonElement input, long firstSubmittedAt, long retryDeadline, long attemptCount, long lastAttemptAt,
            string lastAttemptClassification, string resolutionState, bool mediaAdmissionAttempted)
        {
            RequestId = requestId;
            Incarnation = incarnation;
            PayloadFingerprint = payloadFingerprint;
            Operation = operation;
            ProjectId = projectId;
            Input = input;
            FirstSubmittedAt = firstSubmittedAt;
            RetryDeadline = retryDeadline;
            AttemptCount = attemptCount;
            LastAttemptAt = lastAttemptAt;
            LastAttemptClassification = lastAttemptClassification;
            ResolutionState = resolutionState;
            MediaAdmissionAttempted = mediaAdmissionAttempted;
        }

        internal string RequestId { get; }

        internal string Incarnation { get; }

        internal string PayloadFingerprint { get; }

        internal OperationDescriptor Operation { get; }

        internal string? ProjectId { get; }

        internal JsonElement Input { get; }

        internal long FirstSubmittedAt { get; }

        internal long RetryDeadline { get; }

        internal long AttemptCount { get; set; }

        internal long LastAttemptAt { get; set; }

        internal string LastAttemptClassification { get; set; }

        internal string ResolutionState { get; set; }

        internal bool MediaAdmissionAttempted { get; }

        internal bool Settled => ResolutionState == "committed" || ResolutionState == "accepted";

        internal static string Serialize(IEnumerable<RecoveryRecord> records)
        {
            using (var stream = new MemoryStream())
            {
                using (var writer = new Utf8JsonWriter(stream))
                {
                    writer.WriteStartArray();
                    foreach (RecoveryRecord record in records) record.Write(writer);
                    writer.WriteEndArray();
                }

                return Encoding.UTF8.GetString(stream.ToArray());
            }
        }

        // Every field is checked before a stored record can authorize a resend.
        internal static List<RecoveryRecord> Restore(string saved)
        {
            JsonElement values;
            try
            {
                values = JsonParsing.Parse(saved);
            }
            catch (JsonException error)
            {
                throw new InvalidDataException("Invalid mutation recovery storage", error);
            }

            if (values.ValueKind != JsonValueKind.Array || values.GetArrayLength() > MaxRecords)
                throw new InvalidDataException("Invalid mutation recovery storage");
            var restored = new List<RecoveryRecord>();
            var identities = new HashSet<string>(StringComparer.Ordinal);
            try
            {
                foreach (JsonElement item in values.EnumerateArray())
                {
                    RecoveryRecord record = Read(item);
                    if (!identities.Add(record.RequestId)) throw new InvalidDataException("Duplicate mutation recovery identity");
                    restored.Add(record);
                }
            }
            catch (ProtocolFormatException error)
            {
                throw new InvalidDataException(error.Message, error);
            }

            return restored;
        }

        private static RecoveryRecord Read(JsonElement item)
        {
            if (item.ValueKind != JsonValueKind.Object) throw new InvalidDataException("Invalid protocol object");
            string? operationId = JsonParsing.OptionalString(item, "operation");
            OperationDescriptor? operation = null;
            foreach (OperationDescriptor candidate in Operations.All)
            {
                if (candidate.Id == operationId) operation = candidate;
            }

            if (operation == null) throw new InvalidDataException("Unknown generated GraphQL operation");
            string? resolutionState = JsonParsing.OptionalString(item, "resolutionState");
            if (operation.Kind != OperationKind.Mutation ||
                (resolutionState != "pending" && resolutionState != "unknown" && resolutionState != "rejected" &&
                 resolutionState != "committed" && resolutionState != "accepted"))
            {
                throw new InvalidDataException("Invalid recovery record");
            }

            string? projectId = null;
            if (item.TryGetProperty("projectId", out JsonElement project))
            {
                projectId = Protocol.ParseId(project.ValueKind == JsonValueKind.String ? CanonicalJson.ReadString(project) : null);
            }

            if ((operation.Plane == "communication") != (projectId != null)) throw new InvalidDataException("Invalid recovery project scope");
            long firstSubmittedAt = Clock(item, "firstSubmittedAt"), retryDeadline = Clock(item, "retryDeadline");
            long attemptCount = Clock(item, "attemptCount"), lastAttemptAt = Clock(item, "lastAttemptAt");
            bool mediaAdmissionAttempted = false;
            if (item.TryGetProperty("mediaAdmissionAttempted", out JsonElement media))
            {
                if (media.ValueKind != JsonValueKind.True) throw new InvalidDataException("Invalid native admission marker");
                mediaAdmissionAttempted = true;
            }

            string requestId = Protocol.ParseId(JsonParsing.OptionalString(item, "requestId"));
            string incarnation = RequiredString(item, "incarnation");
            string payloadFingerprint = RequiredString(item, "payloadFingerprint");
            if (!item.TryGetProperty("input", out JsonElement input) || input.ValueKind != JsonValueKind.Object)
                throw new InvalidDataException("Invalid protocol object");
            CanonicalJson.Serialize(input);
            string lastAttemptClassification = RequiredString(item, "lastAttemptClassification");
            return new RecoveryRecord(requestId, incarnation, payloadFingerprint, operation, projectId, input.Clone(), firstSubmittedAt,
                retryDeadline, attemptCount, lastAttemptAt, lastAttemptClassification, resolutionState!, mediaAdmissionAttempted);
        }

        private static string RequiredString(JsonElement item, string name) =>
            JsonParsing.OptionalString(item, name) ?? throw new InvalidDataException("Expected a protocol string");

        private static long Clock(JsonElement item, string name)
        {
            if (!item.TryGetProperty(name, out JsonElement value) || value.ValueKind != JsonValueKind.Number ||
                !value.TryGetInt64(out long number) || number < 0 || number > Protocol.MaxSafeInteger)
            {
                throw new InvalidDataException("Invalid recovery clock or count");
            }

            return number;
        }

        // Field order matches the TypeScript SDK's stored records.
        private void Write(Utf8JsonWriter writer)
        {
            writer.WriteStartObject();
            writer.WriteString("requestId", RequestId);
            writer.WriteString("incarnation", Incarnation);
            writer.WriteString("payloadFingerprint", PayloadFingerprint);
            writer.WriteString("operation", Operation.Id);
            if (ProjectId != null) writer.WriteString("projectId", ProjectId);
            writer.WritePropertyName("input");
            Input.WriteTo(writer);
            writer.WriteNumber("firstSubmittedAt", FirstSubmittedAt);
            writer.WriteNumber("retryDeadline", RetryDeadline);
            writer.WriteNumber("attemptCount", AttemptCount);
            writer.WriteNumber("lastAttemptAt", LastAttemptAt);
            writer.WriteString("lastAttemptClassification", LastAttemptClassification);
            writer.WriteString("resolutionState", ResolutionState);
            if (MediaAdmissionAttempted) writer.WriteBoolean("mediaAdmissionAttempted", true);
            writer.WriteEndObject();
        }
    }
}
